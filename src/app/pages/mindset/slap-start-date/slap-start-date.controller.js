(function () {
    'use strict';

    angular
        .module('app.pages.mindset')
        .controller('SlapStartDateController', SlapStartDateController);

    /* @ngInject */
    function SlapStartDateController($scope, $state, pageService, stepService, activeStep, excuteItemService, excuteItems, $q) {

        $scope.visible = true;
        $scope.changed = false;

        var date = new Date();
        var currentMonth = ((date.getMonth() + 1) % 12).toString();
        var currentYear = date.getFullYear();
        var excuteItems = excuteItems;

        $scope.notifications = [];

        angular.extend($scope, activeStep.model, {
            forward: true,
            sendData: sendData,
            saved: false,

            valueChanged: false
        });

        var beforeSave = moment({year: $scope.data.year, month: +$scope.data.month - 1, day:1});
        
        if ($scope.data.year === null) {
            $scope.data.year = currentYear
        }

        if ($scope.data.month === null) {
            $scope.data.month = currentMonth;
        }

        $scope.$watch('data.month', function (value) {
            if (value !== undefined) {
                if (+value < +currentMonth) {
                    $scope.data.year = currentYear + 1;
                } else {
                    $scope.data.year = currentYear;
                }
                $scope.changed = true;
            }
        });

        pageService
            .reset()
            .setShowBC(false)
            .addCrumb({name: 'Dashboard', path: 'home'})
            .setPageTitle(stepService.getActiveStep().name);

        function sendData(direction) {
            stepService.updateActiveModel($scope);
            stepService.setFinishActiveStep();

            var nextprevStep = stepService.getNextAndPrevStep();
            var urls = activeStep.sref.split('.');
            //If user changed the date and have excute items.
            if ($scope.data.month != (beforeSave.month() + 1))  {
                //As a matter of fact, the new startdate cannot be a past of now because of $scope.$watch('data.month', function (value) { line codes
                var newStartDate = moment({year: $scope.data.year, month: +$scope.data.month - 1, day:1});
                if (newStartDate.isBefore(moment(), 'day')) {
                    $scope.notifications = [{name: 'Wrong Start Date', type: 'error', message: 'You cannot set SLAP Start Date to past.', show: true}];
                } else {
                    $scope.notifications = [];

                    /// Now move all excute items according to its start date
                    var deltaMonths = Math.ceil(moment.duration(newStartDate - beforeSave).asMonths());

                    _.each(excuteItems, function(item){
                        item.dueDate = moment(item.dueDate).add(deltaMonths, 'months').format('YYYY-MM-DD');
                        if ([28, 29, 30, 31].indexOf(moment(item.dueDate).date()) != -1){
                            item.dueDate = moment(item.dueDate).date(28).format('YYYY-MM-DD');
                        }

                    });

                    $q.all(excuteItems.map(function(item){ return item.save();}))
                    .then(function(responses){
                        return stepService.sendApiData(urls[urls.length - 1], $scope.data)
                        .then(function () {
                            stepService.setRequestApiFlag();
                            $scope.saved = true;
                            if(direction == 'forward')  
                                $state.go(nextprevStep.nextStep.sref); 
                            else if(direction == 'backward')
                                $state.go(nextprevStep.prevStep.sref);
                        });
                    });
                }
            } else {

                if(direction == 'forward')  
                    $state.go(nextprevStep.nextStep.sref); 
                else if(direction == 'backward')
                    $state.go(nextprevStep.prevStep.sref);
            }
            
        }

        $scope.$on('$stateChangeStart', function (event, toState, toStateParams) {
            if ($scope.saved != true) {
                sendData();
            }
        });
    }

}());