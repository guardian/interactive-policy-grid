/* global initElectionNav */
define([
    'text!templates/main.html',
    'ractive',
    'rvc!components/advert',
    'rvc!components/policy-grid',
    'rvc!components/sticky-bar',
    'pegasus',
    '../libs/requestAnimationFrame',
    '../libs/classList'
], function(
    mainTemplate,
    Ractive,
    Advert,
    PolicyGrid,
    StickyBar,
    pegasus
) {
    'use strict';

    var POSTCODE_URL = 'http://interactive.guim.co.uk/2015/general-election/postcodes/';

    var ractive;

    // TODO: sticky-bar height
    function getOffset(el) {
        return el ? el.offsetTop + (el.classList.contains('section--sticky-bar') && -60) + getOffset(el.offsetParent) : 0;
    }

    var scrollTo = (function () {
        var scrollTimer, interval = 15, total = 300;

        return function (id) {
            var start = window.pageYOffset;
            var end = getOffset(document.getElementById(id));
            var distance = end - start;
            var elapsed = 0;

            scrollTimer = window.requestAnimationFrame(function scrollHandler() {
                window.scrollTo(0, Math.floor(start + distance * (elapsed / total)));
                if (elapsed === total) {
                    scrollTimer = undefined;
                } else {
                    elapsed += interval;
                    scrollTimer = window.requestAnimationFrame(scrollHandler);
                }
            });
        };
    })();

    window.debounce = function (fn) {
        var timer, run;

        return function runner() {
            if (timer) {
                run = true;
            } else {
                fn();
                timer = setTimeout(function () {
                    timer = undefined;
                    if (run) {
                        run = false;
                        runner();
                    }
                }, 100);
            }
        };
    };

    function share(network, extra) {
        var twitterBaseUrl = 'https://twitter.com/intent/tweet?text=';
        var twitterMessage = (extra || '') + 'Will their policies work for you? #ge15';
        var facebookBaseUrl = 'https://www.facebook.com/sharer/sharer.php?ref=responsive&u=';
        var googleBaseUrl = 'https://plus.google.com/share?url=';
        var emailSubject = 'Will their policies work for you?';
        var url = encodeURIComponent(window.location.href);
        var shareWindow;

        if (network === 'twitter') {
            shareWindow = twitterBaseUrl + encodeURIComponent(twitterMessage + ' ') + url;
        } else if (network === 'facebook') {
            shareWindow = facebookBaseUrl + url;
        } else if (network === 'email') {
            shareWindow = 'mailto:?subject=' + encodeURIComponent(emailSubject) + '&body=' + url;
        } else if (network === 'google') {
            shareWindow = googleBaseUrl + url;
        }

        window.open(shareWindow, network + 'share', 'width=640,height=320');
    }

    function getConstituency(postcode, success, error) {
        pegasus(POSTCODE_URL + postcode.replace(/ /g, '').toUpperCase()).then(function (_, xhr) {
            success(xhr.responseText);
        }, error);
    }

    function closePolicyGrids() {
        ractive.findAllComponents('policy-grid').forEach(function (grid) {
            grid.fire('close');
        });
    }

    function start(el) {
        var parties = ['Labour', 'SNP', 'Green', 'Ukip', 'Conservative', 'LD', 'PC'].map(function (party) {
            var id = party.toLowerCase();
            return {
                'id': id,
                'name': party,
                'selected': false,
                'elements': document.getElementsByClassName('js-party-' + id)
            };
        });

        ractive = new Ractive({
            'el': el,
            'template': mainTemplate,
            'components': {
                'advert': Advert,
                'policy-grid': PolicyGrid,
                'sticky-bar': StickyBar
            },
            'data': {
                'mode': window.location.hash === '#explore' ? 'explore' : 'basic',
                'modeOpacity': 1,
                'questions': [],
                'areas': [],
                'parties': parties
            },
            'computed': {
                'questionsAnswered': function () {
                    return this.get('questions').filter(function (question) {
                        return question.answers.reduce(function (hasAnswer, answer) {
                            return hasAnswer || answer.selected;
                        }, false);
                    });
                },
                'userPolicyCount': function () {
                    var answerPolicies = this.get('questionsAnswered').reduce(function (len, question) {
                        return len + question.answers.filter(function (answer) {
                            return answer.selected;
                        }).reduce(function (policyCount, answer) {
                            return policyCount + answer.policies.count;
                        }, 0);
                    }, 0);

                    return answerPolicies;
                },
                'allPolicyCount': function () {
                    return this.get('areas').reduce(function (len, areas) {
                        return len + areas.policies.length;
                    }, 0);
                }
            },
            'decorators': {
                'section': function (node, context) {
                    node.sectionContext = context;
                    return {'teardown': function () {}};
                }
            }
        });

        ractive.on('goto', function (evt, id) {
            scrollTo(id);
            closePolicyGrids();
            return false;
        });

        ractive.on('mode', function (evt, mode) {
            this.animate('modeOpacity', 0).then(function () {
                ractive.animate('modeOpacity', 1);
                ractive.set('mode', mode);
                window.scrollTo(0, 0); // without animation
                closePolicyGrids();
            });
            return false;
        });

        ractive.on('answer', function (evt) {
            var questionNo = evt.index.questionNo;
            var multi = this.get('questions.' + questionNo + '.multi');
            if (!multi) {
                this.set('questions.' + questionNo + '.answers.*.selected', false);
                this.fire('goto', undefined, 'question-' + (questionNo + 1));
            }

            this.toggle(evt.keypath + '.selected');
            return false;
        });

        ractive.on('share', function (evt, network) { share(network); });

        ractive.on('policy-grid.share', function (evt, network) {
            share(network, '#' + evt.context.party + ': ' + evt.context.policy + '. ');
        });

        ractive.observe('userPolicyCount', function () {
            var el = ractive.find('.link-to-policies');
            el.classList.add('do-animation');
            setTimeout(function () {
                el.classList.remove('do-animation');
            }, 300);
        }, {'init': false});

        ractive.observe('userArea', function (area) {
            scrollTo('area-' + area);
            closePolicyGrids();
        }, {'init': false});

        ractive.observe('parties', function (parties) {
            var hasSelected = parties.reduce(function (selected, party) {
                return selected || party.selected;
            }, false);

            parties.forEach(function (party) {
                var i, method = !hasSelected || party.selected ? 'remove' : 'add';
                for (i = 0; i < party.elements.length; i++) {
                    party.elements[i].classList[method]('is-hidden');
                }
            });
            closePolicyGrids();
        });

        (function () {
            var sections = document.getElementsByClassName('js-section');

            document.addEventListener('scroll', window.debounce(function () {
                var i, offset = window.pageYOffset;

                for (i = sections.length - 1; i >= 0; i--) {
                    if (offset >= getOffset(sections[i])) {
                        ractive.set('currentSection', sections[i].sectionContext);
                        return;
                    }
                }

                ractive.set('currentSection', undefined);
            }));
        })();

        initElectionNav("pollprojection");
    }

    function data(areas, questions, constituencies) {
        ractive.set('areas', areas);
        ractive.set('questions', questions);

        ractive.on('postcode', function (evt, userPostcode) {
            getConstituency(userPostcode, function (ons_id) {
                ractive.set('userConstituency', constituencies[ons_id]);
            }, function () {});
            return false;
        });

    }

    return {
        'start': start,
        'data': data
    };
});
