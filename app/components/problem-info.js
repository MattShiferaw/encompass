Encompass.ProblemInfoComponent = Ember.Component.extend(Encompass.CurrentUserMixin, Encompass.ErrorHandlingMixin, {
  elementId: 'problem-info',
  isEditing: false,
  problemName: null,
  problemText: null,
  problemPublic: true,
  privacySetting: null,
  savedProblem: null,
  isWide: false,
  checked: true,
  filesToBeUploaded: null,
  isProblemUsed: false,
  showAssignment: false,
  problemList: [],
  sectionList: null,
  updateProblemErrors: [],
  imageUploadErrors: [],
  findRecordErrors: [],
  createRecordErrors: [],
  isMissingRequiredFields: null,
  alert: Ember.inject.service('sweet-alert'),

  init: function () {
    this._super(...arguments);
    this.get('store').findAll('section').then(sections => {
      this.set('sectionList', sections);
    }).catch((err) => {
      this.handleErrors(err, 'findRecordErrors');
    });
  },

  didReceiveAttrs: function () {
    this.set('isWide', false);
    this.set('showAssignment', false);
    this.set('isEditing', false);
    this.get('store').findAll('section').then(sections => {
      this.set('sectionList', sections);
    }).catch((err) => {
      this.handleErrors(err, 'findRecordErrors');
    });
  },

  insertQuillContent: function() {
    const isEditing = this.get('isEditing');
    if (!isEditing) {
      return;
    }
    const options = {
      debug: 'false',
      modules: {
        toolbar: [
        ['bold', 'italic', 'underline'],
        ['image'],
        ]
      },
      theme: 'snow'
    };
    const that = this;
    this.$('#editor').ready(function() {
      const quill = new window.Quill('#editor', options);
      let problem = that.get('problem');
      let text = problem.get('text');

      that.$('.ql-editor').html(text);
    });
  }.observes('isEditing'),

  // We can access the currentUser using CurrentUserMixin, this is accessible because we extend it
  // Check if the current problem is yours, so that you can edit it
  canEdit: Ember.computed('problem.id', function() {
    let problem = this.get('problem');
    let creator = problem.get('createdBy.content.id');
    let currentUser = this.get('currentUser');
    let accountType = currentUser.get('accountType');
    let canEdit;

    if (accountType === "A") {
      canEdit = true;
    } else if (accountType === "P") {
      if (problem.get('privacySetting') === "O" || creator === currentUser.id) {
        canEdit = true;
      }
    } else if (accountType === "T") {
      if (creator === currentUser.id) {
        canEdit = true;
      }
    } else {
      canEdit = false;
    }
    return canEdit;
  }),

  canDelete: Ember.computed('problem.id', function () {
    let problem = this.get('problem');
    let currentUser = this.get('currentUser');
    let currentUserType = currentUser.get('accountType');
    let creator = problem.get('createdBy.content.id');
    let canDelete;

    if (currentUserType === "A") {
      canDelete = true;
    } else if (currentUserType === "P") {
      if (problem.get('privacySetting') === "O" || creator === currentUser.id) {
        canDelete = true;
      }
    } else if (currentUserType === "T") {
      if (problem.get('privacySetting') === "M") {
        canDelete = true;
      }
    } else {
      canDelete = false;
    }
    return canDelete;
  }),

  resetErrors: function() {
    let errors = ['updateProblemErrors', 'imageUploadErrors', 'isMissingRequiredFields'];
    for (let error of errors) {
      if (this.get(error)) {
        this.set(error, null);
      }
    }
  },

  actions: {
    deleteProblem: function () {
      let problem = this.get('problem');
      this.get('alert').showModal('warning', 'Are you sure you want to delete this problem?', null, 'Yes, delete it')
      .then((result) => {
        if (result.value) {
          problem.set('isTrashed', true);
          this.sendAction('toProblemList');
          problem.save().then((problem) => {
            this.get('alert').showToast('success', 'Problem Deleted', 'bottom-end', 5000, true, 'Undo')
            .then((result) => {
              if (result.value) {
                problem.set('isTrashed', false);
                problem.save().then(() => {
                  this.get('alert').showToast('success', 'Problem Restored', 'bottom-end', 3000, false, null);
                  window.history.back();
                });
              }
            });
          }).catch((err) => {
            this.handleErrors(err, 'updateProblemErrors', problem);
          });
        }
      });
    },

    editProblem: function () {
      let problem = this.get('problem');
      let problemId = problem.get('id');
      let currentUserAccountType = this.get('currentUser').get('accountType');
      let isAdmin = currentUserAccountType === "A";
       this.set('problemName', problem.get('title'));
       this.set('problemText', problem.get('text'));
       this.set('additionalInfo', problem.get('additionalInfo'));
       this.set('privacySetting', problem.get('privacySetting'));

      if (!problem.get('isUsed')) {
        this.get('store').queryRecord('assignment', {
          problem: problemId
        }).then(assignment => {
          if (assignment !== null) {
            this.get('alert').showModal('warning', 'Are you sure you want to edit a problem that has already been assigned', 'This problem has been used in an assignment but no answers have been submitted yet. Be careful editing the content of this problem', 'Yes').then((result) => {
              if (result.value) {
                this.send('continueEdit');
              }
            });
          } else {
            this.send('continueEdit');
          }
        });
      } else {
        if (isAdmin) {
          this.get('alert').showModal('warning', 'Are you sure you want to edit a problem with answers?', 'Be careful changing the content of this problem because changes will be made everywhere this problem is used', 'Yes')
          .then((result) => {
            if (result.value) {
              this.send('continueEdit');
            }
          });
        }
      }
    },

    continueEdit: function () {
      this.set('showEditWarning', false);
      this.set('isEditing', true);
      let problem = this.get('problem');
      this.set('problemName', problem.get('title'));
      this.set('problemText', problem.get('text'));
      this.set('privacySetting', problem.get('privacySetting'));
    },

    cancelEdit: function () {
      this.set('isEditing', false);
      this.resetErrors();
    },

    radioSelect: function (value) {
      this.set('privacySetting', value);
    },

    checkPrivacy: function() {
      let currentPrivacy = this.problem.get('privacySetting');
      let privacy = this.get('privacySetting');

      if (currentPrivacy !== "E" && privacy === "E") {
        this.get('alert').showModal('question', 'Are you sure you want to make your problem public?', "You are changing your problem's privacy status to public. This means it will be accessible to all EnCoMPASS users. You will not be able to make any changes to this problem once it has been used", 'Yes')
        .then((result) => {
          if (result.value) {
            this.send('updateProblem');
          }
        });
      } else {
        this.send('updateProblem');
      }
    },

    updateProblem: function () {
      let title = this.get('problemName');
      const quillContent = this.$('.ql-editor').html();
      let text = quillContent.replace(/["]/g, "'");
      let privacy = this.get('privacySetting');
      let problem = this.get('problem');
      let currentUser = this.get('currentUser');
      let additionalInfo = this.get('additionalInfo');

      if (!title || !text || !privacy) {
        this.set('isMissingRequiredFields', true);
        return;
      } else {
        if (this.get('isMissingRequiredFields')) {
          this.set('isMissingRequiredFields', null);
        }
      }

      if (privacy !== null) {
        problem.set('privacySetting', privacy);
      }

      problem.set('title', title);
      problem.set('text', text);
      problem.set('additionalInfo', additionalInfo);


      if(this.filesToBeUploaded) {
        var uploadData = this.get('filesToBeUploaded');
        var formData = new FormData();
        for (let f of uploadData) {
          formData.append('photo', f);
        }
        let firstItem = uploadData[0];
        let isPDF = firstItem.type === 'application/pdf';

        if (isPDF) {
          Ember.$.post({
            url: '/pdf',
            processData: false,
            contentType: false,
            data: formData
          }).then((res) => {
            this.set('uploadResults', res.images);
            this.store.findRecord('image', res.images[0]._id).then((image) => {
              problem.set('image', image);
              problem.save().then((res) => {
                this.get('alert').showToast('success', 'Problem Updated', 'bottom-end', 3000, false, null);
                // handle success
                this.set('isEditing', false);
                this.resetErrors();
              })
              .catch((err) => {
                this.handleErrors(err, 'updateProblemErrors', problem);
                this.set('showConfirmModal', false);
              });
            });
          })
          .catch((err) => {
            this.handleErrors(err, 'imageUploadErrors');
          });
        } else {
          Ember.$.post({
            url: '/image',
            processData: false,
            contentType: false,
            data: formData
          }).then((res) => {
            this.set('uploadResults', res.images);
            this.store.findRecord('image', res.images[0]._id).then((image) => {
              problem.set('image', image);
              problem.save().then((res) => {
                this.get('alert').showToast('success', 'Problem Updated', 'bottom-end', 3000, false, null);
                this.set('isEditing', false);
                this.resetErrors();
              })
              .catch((err) => {
                this.handleErrors(err, 'updateProblemErrors', problem);
                this.set('showConfirmModal', false);
              });
            });
          })
          .catch((err) =>{
            this.handleErrors(err, 'imageUploadErrors');
          });
        }
      } else {
        if (problem.get('hasDirtyAttributes')) {
          problem.set('modifiedBy', currentUser);
          problem.save().then((res) => {
            this.get('alert').showToast('success', 'Problem Updated', 'bottom-end', 3000, false, null);
            this.resetErrors();
            this.set('showConfirmModal', false);
            this.set('isEditing', false);
          })
          .catch((err) => {
            this.handleErrors(err, 'updateProblemErrors', problem);
            this.set('showConfirmModal', false);
            return;
          });
        } else {
          this.set('isEditing', false);
        }
      }
    },

    addToMyProblems: function() {
      let problem = this.get('problem');
      let originalTitle = problem.get('title');
      let title = 'Copy of ' + originalTitle;
      let text = problem.get('text');
      let additionalInfo = problem.get('additionalInfo');
      let isPublic = problem.get('isPublic');
      let image = problem.get('image');
      let imageUrl = problem.get('imageUrl');
      let createdBy = this.get('currentUser');

      let newProblem = this.store.createRecord('problem', {
        title: title,
        text: text,
        additionalInfo: additionalInfo,
        imageUrl: imageUrl,
        isPublic: isPublic,
        origin: problem,
        createdBy: createdBy,
        image: image,
        privacySetting: "M",
        createDate: new Date()
      });

      newProblem.save()
        .then((problem) => {
          let name = problem.get('title');
          this.set('savedProblem', problem);
          this.get('alert').showToast('success', `${name} added to your problems`, 'bottom-end', 3000, false, null);
        }).catch((err) => {
          this.handleErrors(err, 'createRecordErrors', newProblem);
        });
    },

    duplicateProblem: function () {
      let problem = this.get('problem');
      let originalTitle = problem.get('title');
      let title = 'Copy of ' + originalTitle;
      let text = problem.get('text');
      let additionalInfo = problem.get('additionalInfo');
      let isPublic = problem.get('isPublic');
      let imageUrl = problem.get('imageUrl');
      let image = problem.get('image');
      let createdBy = this.get('currentUser');

      let newProblem = this.store.createRecord('problem', {
        title: title,
        text: text,
        additionalInfo: additionalInfo,
        imageUrl: imageUrl,
        isPublic: isPublic,
        image: image,
        origin: problem,
        privacySetting: "M",
        createdBy: createdBy,
        createDate: new Date()
      });

      newProblem.save()
        .then((problem) => {
          let name = problem.get('title');
          this.set('savedProblem', problem);
          this.get('alert').showToast('success', `${name} added to your problems`, 'bottom-end', 3000, false, null);
      }).catch((err) => {
        this.handleErrors(err, 'createRecordErrors', newProblem);
      });
    },

    toggleImageSize: function () {
      this.toggleProperty('isWide');
    },


    deleteImage: function () {
      let problem = this.get('problem');
      problem.set('image', null);
      problem.save().then((res) => {
        this.get('alert').showToast('success', 'Image Deleted', 'bottom-end', 3000, false, null);
      })
      .catch((err) => {
        this.handleErrors(err, 'updateProblemErrors', problem);
      });
    },

    toAssignmentInfo: function (assignment) {
      this.sendAction('toAssignmentInfo', assignment);
    },

    showAssignment: function () {
      this.set('showAssignment', true);
      this.get('problemList').pushObject(this.problem);
      Ember.run.later(() => {
        $('html, body').animate({scrollTop: $(document).height()});
      }, 100);
    }
  }
});