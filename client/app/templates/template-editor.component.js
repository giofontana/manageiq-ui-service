/* eslint camelcase: "off" */
import './_template-editor.sass';
import templateUrl from './template-editor.html';

export const TemplateEditorComponent = {
  controller: ComponentController,
  controllerAs: 'vm',
  templateUrl,
  bindings: {
    template: "<",
  },
};

/** @ngInject */
function ComponentController( $state, TemplatesService, EventNotifications, lodash) {
  const vm = this;

  const templateTypes = [
    {
      "label": "Amazon Cloudformation",
      "value": "OrchestrationTemplateCfn",
    },
    {
      "label": "Openstack Heat",
      "value": "OrchestrationTemplateHot",
    },
    {
      "label": "Microsoft Azure",
      "value": "OrchestrationTemplateAzure",
    },
    {
      "label": "VNF",
      "value": "OrchestrationTemplateVnfd",
    },
  ];

  vm.$onInit = activate();

  function activate() {
    angular.extend(vm, {
      saveTemplate: saveTemplate,
      templateTypes: templateTypes,
      templateTypeValue: '',
      cancelChanges: cancelChanges,
    });
    if (!vm.template) {
      vm.template = {
        name: '',
        type: '',
        description: '',
        content: '',
        orderable: false,
        draft: true,
      };
    } else {
      vm.templateTypeValue = lodash.find(templateTypes, { value: vm.template.type });
    }
  }

  function saveTemplate() {
    if (!vm.template.id) {
      vm.template.type = vm.templateTypeValue.value;
      TemplatesService.createTemplate(vm.template).then(createSuccess, createFailure);
    }
    function createSuccess(data) {
      EventNotifications.success(__("Template created successfully."));
      vm.template.id = data.results[0].id;
    }
    function createFailure(data) {
      EventNotifications.error(__("There was an error creating the template"));
    }
  }
  function cancelChanges() {
    $state.go('templates');
  }
}
