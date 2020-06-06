/**
 * Testing related utilities.
 */
const request = require("request");

/**
 * A wrapper for request.
 *
 * @param {object} data request's "options". More info here: https://www.npmjs.com/package/request
 * @param {boolean} expectJSON if the webservice is expected to return JSON for all cases
 */
exports.promisify = (data, expectJSON = true) =>
  new Promise((resolve, reject) => {
    request.post(data, (err, res, body) => {
      if (err) {
        reject(err);
      }

      try {
        if (expectJSON) {
          resolve(JSON.parse(body));
        } else {
          resolve(body);
        }
      } catch (e) {
        reject(e);
      }
    });
  });
