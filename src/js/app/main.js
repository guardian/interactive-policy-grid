define([
    'pegasus',
    'app'
], function (
    pegasus,
    app
) {
    var SHEET_URL = 'http://interactive.guim.co.uk/spreadsheetdata/1FH1NEYStgczP_B4xPPMr3_DuXHBAipkn2S0zhcFH_LU.json';

    function parseList(list) {
        return list.split(',')
            .map(function (item) { return item.trim(); })
            .filter(function (item) { return item.length > 0; });
    }

    function init(el) {
        pegasus(SHEET_URL).then(function (spreadsheet) {
            var policies = spreadsheet.sheets.policies.map(function (policy) {
                policy.area = policy.area.toLowerCase();
                policy.answers = parseList(policy.answers);
                return policy;
            });

            var packages = spreadsheet.sheets.packages.map(function (pkg) {
                return {
                    'name': pkg.name,
                    'policies': policies.filter(function (policy) { return policy.package === pkg.id; })
                };
            });

            function mkPolicies(cmpFn) {
                var policyPackages = packages.map(function (pkg) {
                    return {
                        'name': pkg.name,
                        'policies': pkg.policies.filter(cmpFn)
                    };
                }).filter(function (policyPackage) { return policyPackage.policies.length > 0; });

                return {
                    'packages': policyPackages,
                    'count': policyPackages.reduce(function (len, policyPackage) {
                        return len + policyPackage.policies.length;
                    }, 0)
                };
            }

            var areas = spreadsheet.sheets.areas.map(function (area) {
                return {
                    'area': area.area,
                    'policies': mkPolicies(function (policy) {
                        return policy.area.toLowerCase() === area.area.toLowerCase();
                    })
                };
            });

            var questions = spreadsheet.sheets.questions.map(function (question) {
                var answers = ['answer1', 'answer2', 'answer3', 'answer4']
                    .filter(function (key) { return question[key]; })
                    .map(function (key) {
                        var answerId = question[key + 'id'];
                        return {
                            'id': answerId,
                            'text': question[key],
                            'policies': mkPolicies(function (policy) {
                                return policy.answers.indexOf(answerId) !== -1;
                            })
                        };
                    });

                return {
                    'question': question.question,
                    'answers': answers
                };
            });

            var interests = spreadsheet.sheets.interests.map(function (interest) {
                return {
                    'id': interest.id,
                    'text': interest.name,
                    'policies': mkPolicies(function (policy) {
                        return policy.answers.indexOf(interest.id) !== -1;
                    })
                };
            });

            app.start(el, areas, questions, interests);
        });
    }

    return {
        'init': init
    };
});
