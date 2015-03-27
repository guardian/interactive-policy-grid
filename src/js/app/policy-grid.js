define([
    'text!templates/policyGrid.html',
    'ractive'
], function (
    template,
    Ractive
) {
    return Ractive.extend({
        'template': template,
        'data': {
            'policyNo': 0
        },
        'oncomplete': function () {
            this.on('policy', function (evt) {
                evt.original.preventDefault();
                this.set('policyNo', evt.context.rowNumber);
            });
        }
    });
});
