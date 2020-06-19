/**
 * @jest-environment node
 */
const mongoose = require("mongoose");
const User = require("../../src/models/User.js");
const promisify = require("../util.js").promisify;
require("../../src/config/db.js");

describe("Payment test suite", () => {
  const user = "uploader@test.com";
  const pass = "lol";
  // let token = ''

  beforeAll(async (done) => {
    User.create({ email: user, password: pass, name: "Tester #1" })
      .then(() =>
        promisify({
          url: `http://${apiUrl}/auth/login`,
          form: {
            email: user,
            password: "lol",
          },
        })
      )
      .then((res) => {
        // token = res.token
        done();
      });
  });

  afterAll((done) => {
    User.deleteOne({ email: user }).then(() => {
      mongoose.connection.close();
      done();
    });
  });

  it("An unregistered route is requested", () => {
    expect.assertions(1);
    return promisify(
      {
        url: `http://${apiUrl}/payment/nonexisting`,
      },
      false
    ).then((data) =>
      expect(data).toContain("Cannot POST /payment/nonexisting")
    );
  });

  it("Unauthenticated payment initiation request", () => {
    expect.assertions(1);
    return promisify(
      {
        url: `http://${apiUrl}/payment/initiate`,
      },
      false
    ).then((data) => expect(data).toBe("Unauthorized"));
  });

  it("Unauthenticated payment finalization request", () => {
    expect.assertions(1);
    return promisify(
      {
        url: `http://${apiUrl}/payment/verify`,
      },
      false
    ).then((data) => expect(data).toBe("Unauthorized"));
  });
});
