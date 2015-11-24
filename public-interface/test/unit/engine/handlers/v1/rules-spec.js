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
var expect = require('expect.js'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    rulesHandler = rewire('../../../../../engine/handlers/v1/rules'),
    httpStatuses = require('../../../../../engine/res/httpStatuses');

describe('rules handler', function(){
    var reqMock = {
            iotDomain: {
                id: 1
            }
        },
        responseCode,
        resMock;

    beforeEach(function() {
        responseCode = null;
        resMock = {
            send: sinon.spy(),
            status: function(code) {
                responseCode = code;
                return this;
            }
        };
    });

    afterEach(function(){
        rulesHandler.__set__('rules', undefined);
    });

    var expectResponseCode = function (code) {
        expect(resMock.send.calledOnce).to.equal(true);
        expect(responseCode).to.eql(code);
    };

    var expectOkResponse = function(body) {
        expectResponseCode(httpStatuses.OK.code);
        if(body) {
            expect(resMock.send.calledWith(body)).to.equal(true);
        }
    };

    var expectCreatedResponse = function(body) {
        expectResponseCode(httpStatuses.Created.code);
        if(body) {
            expect(resMock.send.calledWith(body)).to.equal(true);
        }
    };

    describe('usage', function(){
        it('should replies 200 with specific headers', function(done){
            // prepare
            resMock.setHeader = sinon.spy();

            // execute
            rulesHandler.usage(reqMock, resMock);

            // attest
            expectOkResponse();
            expect(resMock.setHeader.calledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT')).to.equal(true);

            done();
        });
    });

    describe('get rules', function(){
        it('should replies all rules', function(done){
            // prepare
            var rules = [
                    {
                        externalId: '1'
                    }
                ],
                apiMock = {
                    getRules: sinon.stub().callsArgWith(1, null, rules)
                };
            reqMock.params = { accountId: 1};

            rulesHandler.__set__('rules', apiMock);

            // execute
            rulesHandler.getRules(reqMock, resMock);

            // attest
            expectOkResponse(rules);

            done();
        });

        it('should replies with an error if something goes wrong', function(done){
            // prepare
            var error = new Error(500),
                apiMock = {
                    getRules: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            reqMock.params = { accountId: 1};

            rulesHandler.__set__('rules', apiMock);

            // execute
            rulesHandler.getRules(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('get rule', function(){
        it('should replies with 200 and the requested rules if everything is ok', function(done){
            // prepare
            var rule = {
                    externalId: '1'
                },
                apiMock = {
                    getRule: sinon.stub().callsArgWith(1, null, rule)
                };

            rulesHandler.__set__('rules', apiMock);
            reqMock.params = {ruleId: 1};

            // execute
            rulesHandler.getRule(reqMock, resMock);

            // attest
            expectOkResponse(rule);

            done();
        });

        it('should replies with an error if something goes wrong', function(done){
            // prepare
            var error = new Error(500),
                apiMock = {
                    getRule: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            rulesHandler.__set__('rules', apiMock);
            reqMock.params = {ruleId: 1};

            // execute
            rulesHandler.getRule(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('add rule', function(){
        it('should replies with 201 if everything is ok', function(done){
            // prepare
            var rule = {
                    externalId: '1'
                },
                apiMock = {
                    addRule: sinon.stub().callsArgWith(1, null, rule)
                };

            rulesHandler.__set__('rules', apiMock);

            // execute
            rulesHandler.addRule(reqMock, resMock);

            // attest
            expectCreatedResponse(rule);

            done();
        });

        it('should replies with an error if something crashes', function(done){
            // prepare
            var error = new Error(500),
                apiMock = {
                    addRule: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            rulesHandler.__set__('rules', apiMock);

            // execute
            rulesHandler.addRule(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('update rule', function(){
        it('should replies with given http status code if everything is ok', function(done){
            // prepare
            var rule = {
                    externalId: '1'
                },
                statusCode = 200,
                apiMock = {
                    updateRule: sinon.stub().callsArgWith(1, null, statusCode, rule)
                };

            rulesHandler.__set__('rules', apiMock);
            reqMock.params = {ruleId: 1};

            // execute
            rulesHandler.updateRule(reqMock, resMock);

            // attest
            expectOkResponse(rule);

            done();
        });

        it('should replies with an error if something crashes', function(done){
            // prepare
            var error = new Error(500),
                apiMock = {
                    updateRule: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            rulesHandler.__set__('rules', apiMock);
            reqMock.params = {ruleId: 1};

            // execute
            rulesHandler.updateRule(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('update rule status', function(){
        it('should replies with 200 if everything is ok', function(done){
            // prepare
            var rule = {
                    externalId: '1'
                },
                apiMock = {
                    updateRuleStatus: sinon.stub().callsArgWith(1, null, rule)
                };

            rulesHandler.__set__('rules', apiMock);
            reqMock.params = {ruleId: 1};
            reqMock.body = {status: 'Archived'};

            // execute
            rulesHandler.updateRuleStatus(reqMock, resMock);

            // attest
            expectOkResponse(rule);

            done();
        });

        it('should replies with an error if something crashes', function(done){
            // prepare
            var error = new Error(500),
                apiMock = {
                    updateRuleStatus: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            rulesHandler.__set__('rules', apiMock);
            reqMock.params = {ruleId: 1};
            reqMock.body = {status: 'Archived'};

            // execute
            rulesHandler.updateRuleStatus(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('add rule as draft', function(){
        it('should replies with 200 if everything is ok', function(done){
            // prepare
            var rule = {
                    externalId: '1'
                },
                apiMock = {
                    addRuleAsDraft: sinon.stub().callsArgWith(1, null, rule)
                };

            rulesHandler.__set__('rules', apiMock);

            // execute
            rulesHandler.addRuleAsDraft(reqMock, resMock);

            // attest
            expectOkResponse(rule);

            done();
        });

        it('should replies with an error if something crashes', function(done){
            // prepare
            var error = new Error(500),
                apiMock = {
                    addRuleAsDraft: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            rulesHandler.__set__('rules', apiMock);

            // execute
            rulesHandler.addRuleAsDraft(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('delete draft', function(){
       it('should delete a draft', function(done){
           // prepare
           var apiMock = {
                   deleteDraft: sinon.stub().callsArgWith(1, null)
               };

           rulesHandler.__set__('rules', apiMock);

           // execute
           rulesHandler.deleteDraft(reqMock, resMock);

           // attest
           expectResponseCode(204);

           done();
       });

        it('should replies with an error if something crashes', function(done){
            // prepare
            var error = new Error(500),
                apiMock = {
                    deleteDraft: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            rulesHandler.__set__('rules', apiMock);

            // execute
            rulesHandler.deleteDraft(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });
});