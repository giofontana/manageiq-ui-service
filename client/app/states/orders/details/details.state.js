import templateUrl from './details.html'

/** @ngInject */
export function OrdersDetailsState (routerHelper, RBAC) {
  routerHelper.configureStates(getStates(RBAC))
}

function getStates (RBAC) {
  return {
    'orders.details': {
      url: '/:serviceOrderId',
      templateUrl,
      controller: StateController,
      controllerAs: 'vm',
      title: __('Order Details'),
      resolve: {
        order: resolveOrder
      },
      data: {
        authorization: RBAC.has('miq_request_show')
      }
    }
  }
}

/** @ngInject */
function resolveOrder ($stateParams, CollectionsApi) {
  return CollectionsApi.get('service_orders', $stateParams.serviceOrderId, {
    expand: ['resources', 'service_requests']
  })
}

/** @ngInject */
function StateController (order, $state) {
  var vm = this

  vm.title = order.name
  vm.order = order

  vm.requestListConfig = {
    showSelectBox: false,
    selectionMatchProp: 'id'
  }
}
