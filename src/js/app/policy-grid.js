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
                var policy = evt.context.rowNumber;
                this.set('policyNo', policy === this.get('policyNo') ? -1 : policy);
                evt.original.preventDefault();
            });
        }
    });
});
