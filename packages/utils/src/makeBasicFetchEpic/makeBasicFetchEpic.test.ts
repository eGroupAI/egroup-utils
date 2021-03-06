import { TestScheduler } from 'rxjs/testing';
import { of, concat } from 'rxjs';
import { createAction } from 'redux-actions';

import makeBasicFetchEpic from './makeBasicFetchEpic';
import { ActionsObservable } from 'redux-observable';

/**
 * ActionsObservable type error solution.
 * https://github.com/redux-observable/redux-observable/issues/620
 */
const testScheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});
/**
 * Create a fetchEpic
 */
const FETCH_GET_USER = 'FETCH_GET_USER';
const FETCH_GET_USER_REQUEST = 'FETCH_GET_USER_REQUEST';
const FETCH_GET_USER_SUCCESS = 'FETCH_GET_USER_SUCCESS';
const FETCH_GET_USER_FAILURE = 'FETCH_GET_USER_FAILURE';

const fetchGetUser = createAction(FETCH_GET_USER);
const fetchGetUserRequest = createAction(FETCH_GET_USER_REQUEST);
const fetchGetUserSuccess = createAction(FETCH_GET_USER_SUCCESS);
const fetchGetUserFailure = createAction(FETCH_GET_USER_FAILURE);

const fetchGetUserEpic = makeBasicFetchEpic({
  actionType: FETCH_GET_USER,
  apiName: 'fetchGetUser',
  fetchRequest: fetchGetUserRequest,
  handleSuccess: (response, { action }) => {
    if (action.payload && action.payload.callback) {
      action.payload.callback();
    }
    return [fetchGetUserSuccess(response.data)];
  },
  handleFailure: error => concat(of(fetchGetUserFailure(error)))
});

describe('makeBasicFetchEpic', () => {
  it('sholud handle success', () => {
    testScheduler.run(({ hot, cold, expectObservable }) => {
      const actionInput$ = hot('-a', {
        a: fetchGetUser({
          id: 10
        })
      });
      const action$ = new ActionsObservable(actionInput$);
      const state$ = null;
      const response = {
        status: 200,
        data: ['a', 'b', 'c']
      };
      const dependencies = {
        apis: {
          fetchGetUser: ({ id }) =>
            cold('-a', {
              a: response
            })
        }
      };

      const output$ = fetchGetUserEpic(action$, state$, dependencies);
      const expectedMarble = '-ab';
      const expectedValues = {
        a: {
          type: FETCH_GET_USER_REQUEST
        },
        b: {
          type: FETCH_GET_USER_SUCCESS,
          payload: response.data
        }
      };

      expectObservable(output$).toBe(expectedMarble, expectedValues);
    });
  });

  it('sholud throw need apis dependency error', done => {
    const action$ = new ActionsObservable(of(fetchGetUser()));
    const output$ = fetchGetUserEpic(action$, null, {});
    output$.subscribe(
      () => {
        done(new Error('should not be called'));
      },
      err => {
        expect(err).toEqual(
          'Error: makeBasicFetchEpic need setup apis dependency.'
        );
        done();
      }
    );
  });

  it('sholud throw api is not a function error', done => {
    const action$ = new ActionsObservable(of(fetchGetUser()));
    const output$ = fetchGetUserEpic(action$, null, {
      apis: {}
    });
    output$.subscribe(
      () => {
        done(new Error('should not be called'));
      },
      err => {
        expect(err).toEqual(new TypeError('api is not a function'));
        done();
      }
    );
  });

  const apis = {
    fetchGetUser: () =>
      new Promise(resolve => {
        resolve();
      })
  };

  it('sholud excute callback after success', done => {
    const actionInput$ = of(
      fetchGetUser({
        callback: () => {
          done();
        }
      })
    );
    const action$ = new ActionsObservable(actionInput$);
    const output$ = fetchGetUserEpic(action$, null, {
      apis
    });
    output$.subscribe();
  });

  it('sholud not have error with array payload', done => {
    const action$ = new ActionsObservable(of(fetchGetUser([])));
    const output$ = fetchGetUserEpic(action$, null, {
      apis
    });
    output$.subscribe(() => {
      done();
    });
  });

  it('sholud not have error with string payload', done => {
    const action$ = new ActionsObservable(of(fetchGetUser('foo')));
    const output$ = fetchGetUserEpic(action$, null, {
      apis
    });
    output$.subscribe(() => {
      done();
    });
  });

  it('sholud not have error with number payload', done => {
    const action$ = new ActionsObservable(of(fetchGetUser(100)));
    const output$ = fetchGetUserEpic(action$, null, {
      apis
    });
    output$.subscribe(() => {
      done();
    });
  });
});
