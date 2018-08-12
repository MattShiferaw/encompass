Encompass.UserListAdminComponent = Ember.Component.extend(Encompass.CurrentUserMixin, {
  elementId: 'user-list-admin',

  // init: function () {
  //   this.get('users');
  // },

  unauthUsers: function () {
    let users = this.users.filterBy('isTrashed', false);
    let unauthUsers = users.filterBy('isAuthorized', false);
    return unauthUsers.sortBy('createDate').reverse();
  }.property('users.@each.isAuthorized'),

  adminUsers: function () {
    let users = this.users.filterBy('isTrashed', false);
    let adminUsers = users.filterBy('isAdmin', true);
    return adminUsers.sortBy('createDate').reverse();
  }.property('users.@each.isAdmin'),

  studentUsers: function () {
    let users = this.users.filterBy('isTrashed', false);
    let students = users.filterBy('isStudent', true);
    return students.sortBy('createDate').reverse();
  }.property('users.@each.isStudent'),

  authUsers: function () {
    let users = this.users.filterBy('isTrashed', false);
    let authUsers = users.filterBy('isAuthorized', true);
    let notStudent = authUsers.filter((user) => {
      let student = user.get('isStudent');
      return student !== true;
    });
    let notAdmin = notStudent.filter((user) => {
      let admin = user.get('isAdmin');
      return admin !== true;
    });
    return notAdmin.sortBy('createDate').reverse();
  }.property('users.@each.isAuthorized'),

  actions: {}

});
