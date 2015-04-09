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

            var areas = spreadsheet.sheets.areas.map(function (area) {
                return {
                    'area': area.area,
                    'policies': policies.filter(function (policy) {
                        return policy.area.toLowerCase() === area.area.toLowerCase();
                    })
                };
            });

            var questions = spreadsheet.sheets.questions.map(function (question) {
                var answers = ['answer1', 'answer2', 'answer3', 'answer4']
                    .filter(function (key) { return question[key]; })
                    .map(function (key) {
                        var id = question[key + 'id'];
                        return {
                            'text': question[key],
                            'id': id,
                            'policies': policies.filter(function (policy) {
                                return policy.answers.indexOf(id) !== -1;
                            })
                        };
                    });

                return {
                    'question': question.question,
                    'answers': answers
                };
            });

            app.start(el, policies, questions, areas);
        });
    }

    return {
        'init': init
    };
});
