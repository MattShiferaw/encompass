const utils = require('./utils');

module.exports.get = {};

const canLoadWorkspace = function(user, ws) {
  console.log('ws.editors', ws.editors);
  const accountType = user.accountType;

  // As of now, students cannot get any workspaces
  if (accountType === 'S' || user.actingRole === 'student') {
    return false;
  }

  // Admins can get any workspace
  if (accountType === 'A') {
    return true;
  }

  const ownerOrg = ws.owner.organization.toString();
  const userOrg = user.organization.toString();

  // PdAdmins can get any workspace that is owned by a member of their org
  if (accountType === 'P') {
    if (ownerOrg === userOrg) {
      return true;
    }
  }

  const wsId = ws._id.toString();
  const userId = user._id.toString();

  const isOwner = userId === wsId;


  const wsEditors = ws.editors.map(ws => ws._id.toString());
  const isEditor = wsEditors.includes(userId);
  console.log('isEditor canLoadWorkspace? ', isEditor);
  const isPublic = ws.mode === 'public';

  // Any teacher or PdAdmin can view a workspace if they are the owner, editor, or ws is public
  // Should we allow students be added as an editor to a WS? Or view as read-only public workspaces?
  return isOwner || isEditor || isPublic;
};

const accessibleWorkspacesQuery = async function(user, ids) {
  const accountType = user.accountType;
  const actingRole = user.actingRole;


  let filter = {
    isTrashed: false
  };

  if (ids) {
    filter._id = {$in: ids};
  }

  // should be stopped earlier in the middleware chain
  if (actingRole === 'student' || accountType === 'S') {
    filter.createdBy = user.id;
    return filter;
  }
  // will only reach here if admins/pdadmins are in actingRole teacher
  if (accountType === 'A') {
    return filter;
  }
  // Teachers and PdAdmins
  filter.$or = [];
  filter.$or.push({ mode: 'public' });
  filter.$or.push({ editors: user._id });
  filter.$or.push({ owner: user._id });

  if (accountType === 'P') {

    const userOrg = user.organization;
    const userIds = await utils.getModelIds('User', { organization: userOrg, accountType: {$ne: 'S'} });

    filter.$or.push({owner: {$in : userIds}});

    return filter;
  }

  if (accountType === 'T') {
    // Workspaces where a teacher is the primary teacher or in the teachers array

    filter.$or.push({'teacher.id': user.id});
    filter.$or.push({'teachers': user.id});

    return filter;
  }
};

module.exports.get.workspace = canLoadWorkspace;
module.exports.get.workspaces = accessibleWorkspacesQuery;