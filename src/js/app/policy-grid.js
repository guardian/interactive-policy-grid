define([
    'text!templates/policyGrid.html',
    'ractive',
    'masonry'
], function (
    template,
    Ractive,
    Masonry
) {
    // This hopefully won't be necessary soon
    function masonryItemDecorator(node) {
        var that = this;
        return {
            'teardown': function () {
                that.masonry.remove(node);
            }
        };
    }

    return Ractive.extend({
        'template': template,
        'data': {
            'policyNo': 0
        },
        'decorators': {
            'masonryItem': masonryItemDecorator
        },
        'oncomplete': function () {
            this.masonry = new Masonry(this.find('.policy-grid__list'), {
                'itemSelector': '.policy-grid__list__item',
                'columnWidth': '.policy-grid__list__sizer',
                'transitionDuration': 0
            });

            this.on('policy', function (evt) {
                this.set('policyNo', evt.context.rowNumber);
                this.masonry.layout();
            });

            this.observe('policies', function () {
                this.masonry.reloadItems();
                this.masonry.layout();
            }, {
                'init': false,
                'defer': true
            });
        }
    });
});