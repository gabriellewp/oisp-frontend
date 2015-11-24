/**
 * Copyright (c) 2014 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
var postgresProvider = require('../../../iot-entities/postgresql'),
    Rule = postgresProvider.rules,
    Account = postgresProvider.accounts,
    User = postgresProvider.users,
    errBuilder = require('../../../lib/errorHandler/index').errBuilder,
    rulesBuilder = require('../helpers/rules-builder'),
    RuleValidator = require('../helpers/index').rulesValidator,
    validator = new RuleValidator(),
    uuid = require('node-uuid'),
    Q = require('q');

var buildInternalRule = function (options) {
    var accountId = ((typeof options.domainId) === 'object' && (typeof options.domainId.public_id) === 'string') ? options.domainId.public_id : options.domainId,
        user = options.user,
        internalRule = options.rule;

    internalRule.owner = user.email;
    internalRule.status = options.status;

    return Q.nfcall(rulesBuilder.formatRule, accountId, user, internalRule)
        .then(function (externalRule) {
            return externalRule;
        });
};

var addRule = function (options, callback) {
    var accountId = options.domainId,
        userId = options.userId,
        rule = options.rule,
        validationErrors = validator.validate(rule);

    if (validationErrors.length === 0) {
        return User.findById(userId)
            .then(function (user) {
                if (!user) {
                    throw errBuilder.Errors.User.NotFound;
                }
                return Q.nfcall(Account.find, accountId)
                    .then(function (account) {
                        if (!account) {
                            throw errBuilder.Errors.Account.NotFound;
                        }
                        rule.externalId = rule.externalId || uuid.v4();
                        rule.id = rule.id || rule.externalId ;
                        var opt = {
                            rule: rule,
                            domainId: accountId,
                            user: user,
                            status: Rule.ruleStatus.active
                        };
                        return buildInternalRule(opt)
                            .then(function(internalRule) {
                                return Rule.addOrUpdateDraft(rule.externalId, accountId, internalRule).
                                    then(function(rule){
                                        callback(null, rule);
                                    });
                            });
                    });
            })
            .then(function (result) {
                callback(null, result);
            })
            .catch(function (err) {
                var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
                if (err && err.code) {
                    errMsg = errBuilder.build(err);
                }
                callback(errMsg);
            });
    } else {
        callback(errBuilder.build(errBuilder.Errors.Rule.InvalidData, validationErrors));
    }
};

var getRule = function (options, resultCallback) {
    var accountId = options.domainId,
        externalId = options.externalId;

    return Rule.findAccountWithRule(accountId, externalId)
        .then(function (results) {
            return results.rule;
        })
        .then(function (res) {
            resultCallback(null, res);
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            resultCallback(errMsg);
        });
};

var getRules = function (accountId, resultCallback) {
    return Rule.all(accountId)
        .then(function (res) {
            resultCallback(null, res);
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            resultCallback(errMsg);
        });
};

var isRuleStatusValid = function(status) {
    var rule_statuses = Object.keys(Rule.ruleStatus).map(function (key) {
        return Rule.ruleStatus[key];
    });

    return status && rule_statuses.indexOf(status) !== -1;
};

var getRulesByStatus = function (status, resultCallback) {
    if (!isRuleStatusValid(status)) {
        resultCallback(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
    } else {
        return Rule.allByStatus(status)
            .then(function (res) {
                resultCallback(null, res);
            })
            .catch(function (err) {
                var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
                if (err && err.code) {
                    errMsg = errBuilder.build(err);
                }
                resultCallback(errMsg);
            });
    }
};

var updateRule = function (options, callback) {
    var accountId = options.domainId,
        userId = options.user,
        rule = options.rule,
        externalId = options.externalId,
        validationErrors = validator.validate(rule);

    if (validationErrors.length === 0) {
        return Rule.findUserWithAccountAndRule(userId, accountId, externalId)
            .then(function () {
                return User.findById(userId)
                    .then(function (user) {
                        if (!user) {
                            throw errBuilder.Errors.User.NotFound;
                        }
                        rule.externalId = externalId;

                        var opt = {
                            externalRule: rule,
                            rule: rule,
                            domainId: accountId,
                            user: user,
                            status: rule.status
                        };

                        opt.externalId = externalId;
                        return buildInternalRule(opt)
                            .then(function (internalRule) {
                                return Rule.addOrUpdateDraft(rule.externalId, accountId, internalRule);
                            }).catch(function () {
                                throw errBuilder.Errors.Rule.InternalError.UpdatingError;
                            });

                    })
                    .then(function (res) {
                        callback(null, res);
                    });
            })
            .then(function (result) {
                callback(null, result);
            })
            .catch(function (err) {
                var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
                if (err && err.code) {
                    errMsg = errBuilder.build(err);
                }
                callback(errMsg);
            });
    } else {
        callback(errBuilder.build(errBuilder.Errors.Rule.InvalidData, validationErrors));
    }
};

var updateRuleStatus = function (options, callback) {
    var accountId = options.domainId,
        externalId = options.externalId,
        status = options.status;

    return Rule.findAccountWithRule(accountId, externalId)
        .then(function (results) {
            var rule = {
                externalId: externalId,
                lastUpdateDate: results.rule.lastUpdateDate,
                status: status
            };

            return Rule.update(rule.externalId, results.account.public_id, rule)
                .then(function (savedRule) {
                    return savedRule;
                })
                .catch(function () {
                    throw errBuilder.Errors.Rule.InternalError.UpdatingError;
                });
        })
        .then(function (result) {
            callback(null, result);
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            callback(errMsg);
        });
};

var addRuleExecution = function (ruleId, ruleExecutions) {

    return Rule.addRuleExecution(ruleId, ruleExecutions)
        .then(function (savedRule) {
            return savedRule;
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            throw errMsg;
        });
};

var addRuleAsDraft = function (options, callback) {
    var rule = options.rule;
    return User.findById(options.userId)
        .then(function (user) {
            if (!user) {
                throw errBuilder.Errors.User.NotFound;
            }
            rule.externalId = options.rule.externalId || uuid.v4();
            rule.id = rule.externalId;
            var opt = {
                rule: options.rule,
                domainId: options.domainId,
                user: user,
                status: Rule.ruleStatus.draft
            };
            return buildInternalRule(opt)
                .then(function(internalRule) {
                    return Rule.addOrUpdateDraft(rule.externalId, opt.domainId, internalRule)
                        .then(function (savedRule) {
                            callback(null, savedRule);
                        });
                });
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            callback(errMsg);
        });
};

var deleteDraft = function (options, callback) {
    var accountId = options.domainId,
        externalId = options.externalId;

    return Rule.deleteDraft(externalId, accountId)
        .then(function (result) {
            callback(null, result);
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            callback(errMsg);
        });
};

var buildCloneRule = function (accountId, userId, externalRule) {
    var ruleObj = {
        domainId: accountId,
        userId: userId,
        rule: {
            name: externalRule.name + ' - cloned',
            priority: externalRule.priority,
            type: externalRule.type,
            status: externalRule.status,
            resetType: externalRule.resetType,
            actions: externalRule.actions,
            population: externalRule.population,
            conditions: externalRule.conditions,
            description: externalRule.description
        }
    };
    return ruleObj;
};

var cloneRule = function (options, callback) {
    var accountId = options.domainId,
        userId = options.userId;

    getRule(options, function (err, externalRule) {
        if (!err) {
            var obj = buildCloneRule(accountId, userId, externalRule);
            addRule(obj, function (err, savedRule) {
                if (!err) {
                    callback(null, savedRule);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(errBuilder.build(errBuilder.Errors.Rule.NotFound));
        }
    });
};

module.exports = {
    addRule: addRule,
    cloneRule: cloneRule,
    getRule: getRule,
    getRules: getRules,
    updateRule: updateRule,
    updateRuleStatus: updateRuleStatus,
    addRuleAsDraft: addRuleAsDraft,
    deleteDraft: deleteDraft,
    getRulesByStatus: getRulesByStatus,
    addRuleExecution: addRuleExecution
};