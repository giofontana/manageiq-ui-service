(function() {
  'use strict';

  angular.module('app.components')
    .factory('BlueprintDetailsModal', BlueprintDetailsFactory);

  /** @ngInject */
  function BlueprintDetailsFactory($modal) {
    var modalOpen = false;
    var modalBlueprint = {
      showModal: showModal
    };

    return modalBlueprint;

    function showModal(action, blueprint) {
      var modalOptions = {
        templateUrl: 'app/components/blueprint-details-modal/blueprint-details-modal.html',
        controller: BlueprintDetailsModalController,
        controllerAs: 'vm',
        resolve: {
          action: resolveAction,
          blueprint: resolveBlueprint,
          serviceCatalogs: resolveServiceCatalogs,
          serviceDialogs: resolveServiceDialogs,
          tenants: resolveTenants
        }
      };

      var modal = $modal.open(modalOptions);

      return modal.result;

      function resolveBlueprint() {
        return blueprint;
      }

      function resolveAction() {
        return action;
      }

      function resolveServiceCatalogs(CollectionsApi) {
        var options = {
          expand: 'resources',
          sort_by: 'name',
          sort_options: 'ignore_case'};

        return CollectionsApi.query('service_catalogs', options);
      }

      function resolveServiceDialogs(CollectionsApi) {
        var options = {
          expand: 'resources',
          attributes: ['id', 'description', 'label'],
          sort_by: 'description',
          sort_options: 'ignore_case'};

        return CollectionsApi.query('service_dialogs', options);
      }

      function resolveTenants(CollectionsApi) {
        var options = {
          expand: 'resources',
          attributes: ['id', 'name'],
          sort_by: 'name',
          sort_options: 'ignore_case'
        };

        return CollectionsApi.query('tenants', options);
      }
    }
  }

  /** @ngInject */
  function BlueprintDetailsModalController(action, blueprint, BlueprintsState, MarketplaceState, serviceCatalogs, serviceDialogs, tenants,     // jshint ignore:line
                                           $state, BrowseEntryPointModal, CreateCatalogModal, $modalInstance, CollectionsApi, Notifications,
                                           sprintf, $filter, $scope) {
    var vm = this;
    vm.blueprint = blueprint;

    if (action === 'create') {
      vm.modalTitle = __('Create Blueprint');
      vm.modalBtnPrimaryLabel  = __('Create');
    } else if (action === 'publish') {
      vm.modalTitle = __('Publish ') + vm.blueprint.name;
      vm.modalBtnPrimaryLabel  = __('Publish');
    } else {
      vm.modalTitle = __('Edit Blueprint Details');
      vm.modalBtnPrimaryLabel  = __('Save');
    }

    // vm.serviceCatalogs = serviceCatalogs.resources.concat(BlueprintsState.getNewCatalogs());
    vm.serviceCatalogs = serviceCatalogs.resources;

    vm.serviceDialogs = serviceDialogs.resources;

    vm.visibilityOptions = [{
      id: 800,
      name: 'Private'
    }, {
      id: 900,
      name: 'Public'
    }];
    vm.visibilityOptions = vm.visibilityOptions.concat(tenants.resources);

    vm.saveBlueprintDetails = saveBlueprintDetails;
    vm.cancelBlueprintDetails = cancelBlueprintDetails;
    vm.isCatalogUnassigned = isCatalogUnassigned;
    vm.isCatalogRequired = isCatalogRequired;
    vm.isDialogRequired = isDialogRequired;
    vm.selectEntryPoint = selectEntryPoint;
    vm.createCatalog = createCatalog;
    vm.toggleAdvOps = toggleAdvOps;
    vm.tabClicked = tabClicked;
    vm.isSelectedTab = isSelectedTab;
    vm.disableOrderListTabs = disableOrderListTabs;
    vm.dndServiceItemMoved = dndServiceItemMoved;
    vm.toggleActionEqualsProvOrder = toggleActionEqualsProvOrder;

    vm.modalData = {
      'action': action,
      'resource': {
        'name': vm.blueprint.name || __('Untitled Blueprint ') + BlueprintsState.getNextUniqueId(),
        'visibility': vm.blueprint.visibility,
        'catalog_id': (vm.blueprint.content.service_catalog ? vm.blueprint.content.service_catalog.id : null ),
        'dialog_id': (vm.blueprint.content.service_dialog ? vm.blueprint.content.service_dialog.id : null )
      }
    };

    setModalDataEntrypoints();

    vm.provOrderChanged = false;
    vm.actionOrderChanged = false;
    vm.actionOrderEqualsProvOrder = true;
    setOrderLists(vm.blueprint.ui_properties.chartDataModel.nodes);

    if (!vm.modalData.resource.visibility) {
      vm.modalData.resource.visibility = vm.visibilityOptions[0];
    } else {
      vm.modalData.resource.visibility = vm.visibilityOptions[
            findWithAttr(vm.visibilityOptions, 'id', vm.modalData.resource.visibility.id)
          ];
    }

    if (vm.modalData.resource.catalog_id) {
      vm.modalData.resource.catalog = vm.serviceCatalogs[ findWithAttr(vm.serviceCatalogs, 'id', vm.modalData.resource.catalog_id) ];
    }

    if (vm.modalData.resource.dialog_id) {
      vm.modalData.resource.dialog = vm.serviceDialogs[ findWithAttr(vm.serviceDialogs, 'id', vm.modalData.resource.dialog_id) ];
    }

    activate();

    function setModalDataEntrypoints() {
      vm.modalData.resource.provEP = {action: "Provision", value: ""};
      vm.modalData.resource.reConfigEP = {action: "Reconfigure", value: ""};
      vm.modalData.resource.retireEP = {action: "Retirement", value: ""};

      if (vm.blueprint.content.automate_entrypoints) {
        for (var i = 0; i < vm.blueprint.content.automate_entrypoints.length; i++) {
          var aep = vm.blueprint.content.automate_entrypoints[i];
          var newAepStr = BlueprintsState.getEntryPointString(aep);
          // console.log("modal data = " + aep.action + ": " + newAepStr);
          var newAepObj = {action: aep.action, index: i, value: newAepStr};
          switch (aep.action) {
            case "Provision":
              vm.modalData.resource.provEP = newAepObj;
              break;
            case "Reconfigure":
              vm.modalData.resource.reConfigEP = newAepObj;
              break;
            case "Retirement":
              vm.modalData.resource.retireEP = newAepObj;
              break;
          }
        }
      }
    }

    function activate() {
    }

    function findWithAttr(array, attr, value) {
      for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
          return i;
        }
      }
    }

    function isCatalogUnassigned() {
      return (vm.modalData.resource.catalog === undefined || vm.modalData.resource.catalog === null);
    }

    function isCatalogRequired() {
      return (action === 'publish') && isCatalogUnassigned();
    }

    function isDialogRequired() {
      return (action === 'publish') && (vm.modalData.resource.dialog === undefined || vm.modalData.resource.dialog === null);
    }

    function createCatalog() {
      var modalInstance = CreateCatalogModal.showModal();

      modalInstance.then(function(opts) {
        console.log("New Catalog Name is '" + opts.catalogName + "'");
        $( "#createCatalog" ).blur();
      });
    }

    function selectEntryPoint(entryPointType) {
      var modalInstance = BrowseEntryPointModal.showModal(entryPointType);

      modalInstance.then(function(opts) {
        if (entryPointType === 'provisioning') {
          vm.modalData.resource.provEP.value = opts.entryPointData;
        } else if (entryPointType === 'reconfigure') {
          vm.modalData.resource.reConfigEP.value = opts.entryPointData;
        } else if (entryPointType === 'retirement') {
          vm.modalData.resource.retireEP.value =  opts.entryPointData;
        }
      });
    }

    function toggleAdvOps() {
      $( "#advOpsHref" ).toggleClass("collapsed");
      $( "#advOps" ).toggleClass("in");
    }

    vm.selectedTabName = "general";

    function tabClicked(tabName) {
      if ( (tabName === 'provision_order' || tabName === 'action_order') && disableOrderListTabs()) {
        return;
      } else {
        vm.selectedTabName = tabName;
      }
    }

    function isSelectedTab(tabName) {
      return vm.selectedTabName === tabName;
    }

    function disableOrderListTabs() {
      return vm.blueprint.ui_properties.chartDataModel.nodes.length <= 1;
    }

    function cancelBlueprintDetails() {
      $modalInstance.close();
    }

    /*
     * This method converts the service items on a blueprint's canvas into a structure
     * required for the DND Provision and Action Order Lists.
     */
    function setOrderLists(blueprintServiceItems) {     // jshint ignore:line
      var items = angular.copy(blueprintServiceItems);
      var lists = [];
      var item;
      var order;
      var i;
      var l;

      // lists[0] = prov. order list, lists[1] = action order list
      lists[0] = {"containers": []};
      lists[1] = {"containers": []};

      // Mark all blueprint service items as type = 'item'
      // Put into appropriate list order 'containers'
      for (i = 0; i < items.length; i++) {
        item = items[i];
        item.type = "item";
        if (!item.provision_order) {
          item.provision_order = 0;
        }
        // Add item to provOrderList and actionOrderList
        for (l = 0; l < 2; l++) {
          if (l === 0) {
            item.parentListName = "provOrder";    // parentListName denotes which list an item was dragged from
            order = item.provision_order;
          } else if (item.action_order !== undefined) {
            item = angular.copy(items[i]);
            item.parentListName = "actionOrder";
            order = item.action_order;
          } else {
            // no action order defined, only build provOrder list
            continue;
          }
          // if container already exists, push in new item
          if (lists[l].containers[order]) {
            lists[l].containers[order].columns[0].push(item);
          } else {
            // create new container
            lists[l].containers[order] =
            {
              "type": "container",
              "columns": [
                [item],
                []
              ]
            };
          }
        }
      }

      // Set dndModels
      vm.dndModels = {'provOrder': {}, 'actionOrder': {}};

      // lists[0] = prov. order list
      vm.dndModels.provOrder = {
        selected: null,
        list: lists[0].containers
      };

      // lists[1] = action order list
      if (lists[1].containers.length) {  // does actionOrder list have any rows?
        // action order has unique order and is editable
        vm.actionOrderEqualsProvOrder = false;
        vm.dndModels.actionOrder = {
          selected: null,
          list: lists[1].containers
        };
      } else {
        // action order == prov. order
        vm.actionOrderEqualsProvOrder = true;
        initActionOrderFromProvOrderList();
      }
    }

    function toggleActionEqualsProvOrder() {
      vm.actionOrderChanged = true;
      // Make actionOrder list a new list, set parentListName to 'actionOrder'
      initActionOrderFromProvOrderList();
    }

    $scope.$on('dnd-item-moved', function(evt, args) {
      dndServiceItemMoved(args.item);
    });

    function dndServiceItemMoved(origItem) {
      if (origItem.parentListName === "provOrder") {
        vm.provOrderChanged = true;
      } else if (origItem.parentListName === "actionOrder") {
        vm.actionOrderChanged = true;
      }

      if (origItem.parentListName === "provOrder" && vm.actionOrderEqualsProvOrder) {
        initActionOrderFromProvOrderList();
      }
    }

    function initActionOrderFromProvOrderList() {
      // Make actionOrder list a new list, set parentListName to 'actionOrder'
      var actionOrderList = angular.copy(vm.dndModels.provOrder.list);
      for (var l = 0; l < actionOrderList.length; l++) {
        for (var cols = 0; cols < actionOrderList[l].columns.length; cols++) {  // will be 2 columns
          for (var col = 0; col < actionOrderList[l].columns[cols].length; col++) {  // Number of items in a column
            var item = actionOrderList[l].columns[cols][col];
            item.parentListName = "actionOrder";
            item.disabled = vm.actionOrderEqualsProvOrder;
          }
        }
      }

      var lastrow = actionOrderList[ actionOrderList.length - 1 ];
      if (lastrow && vm.actionOrderEqualsProvOrder && lastrow.columns[0].length === 0 && lastrow.columns[1].length === 0) {
        // remove last empty row
        actionOrderList.splice(actionOrderList.length - 1, 1);
      }

      vm.dndModels.actionOrder.list = actionOrderList;
    }

    function saveBlueprintDetails() {   // jshint ignore:line
      vm.blueprint.name = vm.modalData.resource.name;

      /*
      if (!vm.blueprint.visibility || (vm.blueprint.visibility.id.toString() !== vm.modalData.resource.visibility.id.toString())) {
        vm.blueprint.visibility = vm.modalData.resource.visibility;
      }
      */

      if (vm.modalData.resource.catalog) {
        if (!vm.blueprint.content.service_catalog || vm.modalData.resource.catalog.id !== vm.blueprint.content.service_catalog.id) {
          vm.blueprint.content.service_catalog = {"id": vm.modalData.resource.catalog.id};
        }
      } else {
        if (vm.blueprint.content.service_catalog) {
          vm.blueprint.content.service_catalog = {"id": -1};
        }
      }

      if (vm.modalData.resource.dialog) {
        if (!vm.blueprint.content.service_dialog || vm.modalData.resource.dialog.id !== vm.blueprint.content.service_dialog.id) {
          vm.blueprint.content.service_dialog = {"id": vm.modalData.resource.dialog.id};
        }
      } else {
        if (vm.blueprint.content.service_dialog) {
          vm.blueprint.content.service_dialog = {"id": -1};
        }
      }

      setBlueprintEntryPtsFromModalData();

      if (vm.provOrderChanged) {
        saveOrder("provisionOrder");
      }

      if (vm.actionOrderChanged) {
        saveOrder("actionOrder");
      }

      if (action === 'publish') {
        $modalInstance.close();
        saveFailure();

        return;
      }

      /*
      console.log("Orig Blueprint = " + angular.toJson(BlueprintsState.getOriginalBlueprint().content, true));
      console.log("Updated Blueprint = " + angular.toJson(vm.blueprint.content, true));
      console.log("Diff = " + angular.toJson(BlueprintsState.difference(vm.blueprint.content,
                  BlueprintsState.getOriginalBlueprint().content), true));
      */

      saveSuccess();

      function setBlueprintEntryPtsFromModalData() {
        processEntryPoint(vm.modalData.resource.provEP);
        processEntryPoint(vm.modalData.resource.reConfigEP);
        processEntryPoint(vm.modalData.resource.retireEP);
      }

      function processEntryPoint(modalData) {
        var parts = modalData.value.split("\/");
        var instance = (parts.length ? parts.splice(-1, 1)[0] : "");
        var clazz = (parts.length ? parts.splice(-1, 1)[0] : "");
        var namespace = parts.join("\/");
        // console.log("blueprint data = " + modalData.action + " - " + namespace + ":" + clazz + ":" + instance);
        if (modalData.index !== undefined) {
          var bpAEP = vm.blueprint.content.automate_entrypoints[modalData.index];
          if (bpAEP.ae_class === undefined && bpAEP.ae_instance === undefined && bpAEP.ae_namespace === namespace) {
            return;
          }
          if (bpAEP.ae_namespace !== namespace) {
            bpAEP.ae_namespace = namespace;
          }
          if (bpAEP.ae_class !== clazz) {
            bpAEP.ae_class = clazz;
          }
          if (bpAEP.ae_instance !== instance) {
            bpAEP.ae_instance = instance;
          }
        } else {
          if (namespace.length || clazz.length || instance.length) {
            // console.log("Adding new entry point");
            vm.blueprint.content.automate_entrypoints.push({
              action: modalData.action,
              ae_namespace: namespace,
              ae_class: clazz,
              ae_instance: instance
            });
          }
        }
      }

      function saveOrder(orderType) {
        var list;

        if (orderType === 'provisionOrder') {
          list = vm.dndModels.provOrder.list;
        } else if (orderType === 'actionOrder') {
          list = vm.dndModels.actionOrder.list;
        }

        for (var i = 0; i < list.length; i++) {
          var container = list[i];
          if (container.type === 'container') {
            var items = container.columns[0].concat(container.columns[1]);
            for (var j = 0; j < items.length; j++) {
              var item = items[j];
              updateOrder(orderType, item, container.id - 1);
            }
          }
        }
      }

      function updateOrder(orderType, item, orderNum) {
        for (var i = 0; i < vm.blueprint.ui_properties.chartDataModel.nodes.length; i++) {
          var node = vm.blueprint.ui_properties.chartDataModel.nodes[i];
          if (node.id === item.id && node.name === item.name) {
            if (orderType === 'provisionOrder') {
              node.provision_order = orderNum;
            } else if (orderType === 'actionOrder') {
              if (vm.actionOrderEqualsProvOrder) {
                // remove action_order, defer to provision_order
                delete node.action_order;
              } else {
                node.action_order = orderNum;
              }
            }

            return;
          }
        }
      }

      function saveSuccess() {
        if (action === 'create') {
          // This is not actually used anymore, flow has changed
          // keeping it in case flow changes back again.
          Notifications.success(sprintf(__('%s was created.'), vm.blueprint.name));
          $modalInstance.close();
          BlueprintsState.saveBlueprint(vm.blueprint);
          $state.go('blueprints.designer', {blueprintId: vm.blueprint.id});
        } else if (action === 'edit') {
          $modalInstance.close({editedblueprint: vm.blueprint});
          // Notifications.success(sprintf(__('%s details were updated.'), vm.blueprint.name));
        } else if (action === 'publish') {
          $modalInstance.close();
          Notifications.success(sprintf(__('%s was published.'), vm.blueprint.name));
          $state.go($state.current, {}, {reload: true});
        }
      }

      function saveFailure() {
        if (action === 'publish') {
          Notifications.error(__('The Publish Blueprint feature is not yet implemented.'));
        } else {
          Notifications.error(__("There was an error saving this Blueprint's Details."));
        }
      }
    }
  }
})();