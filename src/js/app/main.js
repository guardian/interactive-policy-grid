define([
    'json!data/parties.json',
    'pegasus',
    'app'
], function (
    parties,
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
            var commentators = {
                'RM': 'Rowena Mason',
                'FP': 'Frances Perraudin',
                'NW': 'Nicholas Watt'
            };
            var policies = spreadsheet.sheets.policies.map(function (policy) {
                policy.answers = parseList(policy.answers);
                policy.commentaryname = commentators[policy.commentaryinitials];
                policy.package = policy.package && policy.package.trim() || "";
                return policy;
            });

            var packages = spreadsheet.sheets.packages.map(function (pkg) {
                pkg.id = pkg.id && pkg.id.trim() || "";
                return {
                    'name': pkg.name,
                    'policies': policies.filter(function (policy) { return policy.package === pkg.id; })
                };
            });

            var constituencyIssues = {};
            ['youthindex', 'ageindex', 'badhealthindex', 'noqualsindex', 'unemploymentindex'].forEach(function (issue) {
                constituencyIssues[issue] = policies.filter(function (policy) {
                    return (policy.stats && policy.stats.trim()) === issue;
                });
            });

            var constituencies = {};
            spreadsheet.sheets.constituencies.forEach(function (constituency) {
                constituency.parties = parties[constituency.onsid];
                constituency.policies = constituencyIssues[constituency.max];
                constituencies[constituency.onsid] = constituency;
            });

            function mkAnswer(id, text, cmpFn) {
                var policyPackages = packages.map(function (pkg) {
                    return {
                        'name': pkg.name,
                        'policies': pkg.policies.filter(cmpFn)
                    };
                }).filter(function (policyPackage) {
                    return policyPackage.policies.length > 0;
                });

                policyPackages.sort(function (a, b) {
                    if (a.name === 'Other policies') {
                        return 1;
                    }
                    if (b.name === 'Other policies') {
                        return -1;
                    }
                    return a.policies.length > b.policies.length ? -1 : 1;
                });

                return {
                    'id': id,
                    'text': text,
                    'policies': {
                        'packages': policyPackages,
                        'count': policyPackages.reduce(function (len, policyPackage) {
                            return len + policyPackage.policies.length;
                        }, 0)
                    }
                };
            }

            var areas = spreadsheet.sheets.areas.map(function (area) {
                return {
                    'area': area.area,
                    'id': area.area.replace(/ /g, '-').toLowerCase(),
                    'policies': policies.filter(function (policy) {
                        return policy.area.toLowerCase() === area.area.toLowerCase();
                    })
                };
            });

            var questions = spreadsheet.sheets.questions.map(function (question) {
                var answers = ['answer1', 'answer2', 'answer3', 'answer4']
                    .filter(function (key) { return question[key]; })
                    .map(function (key) {
                        var answerId = question[key + 'id'];
                        return mkAnswer(answerId, question[key], function (policy) {
                            return policy.answers.indexOf(answerId) !== -1;
                        });
                    });

                return {
                    'question': question.question,
                    'answers': answers
                };
            });

            // Add location question
            /*questions.push({
                'question': 'Where do you live?',
                'answers': ['England', 'Scotland', 'Wales', 'Northern Ireland'].map(function (name) {
                    var id = 'location-' + name.toLowerCase().replace(/ /g, '-');
                    return mkAnswer(id, name, function (policy) {
                        return policy.region === name;
                    });
                })
            });*/

            // Add wild card question
            questions.push({
                'question': 'What else interests you?',
                'multi': true,
                'answers': spreadsheet.sheets.interests.map(function (interest) {
                    interest.id = interest.id.trim();
                    return mkAnswer(interest.id, interest.name, function (policy) {
                        return policy.answers.indexOf(interest.id) !== -1;
                    });
                })
            });

            try {
            app.start(el, areas, questions, constituencies);
            } catch (e) {
                console.log(e);
            }
        });
    }

    return {
        'init': init
    };
});
