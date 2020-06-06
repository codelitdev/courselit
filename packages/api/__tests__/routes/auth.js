/**
 * @jest-environment node
 */

const promisify = require("../util.js").promisify;
const User = require("../../src/models/User.js");
const responses = require("../../src/config/strings.js").responses;
require("../../src/config/db.js");
const mongoose = require("mongoose");

describe("Auth Test Suite", () => {
  afterAll(async (done) => {
    await User.deleteOne({ email: "user2@test.com" });
    mongoose.connection.close();
    done();
  });

  describe("Signing up suite", () => {
    beforeEach((done) => {
      User.deleteOne({ email: "user@test.com" }, () => done());
    });

    afterEach((done) => {
      User.deleteOne({ email: "user@test.com" }, () => done());
    });

    it("signup normal", async (done) => {
      expect.assertions(1);
      const response = await promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: "user@test.com",
          password: "lol",
          name: "Tester",
        },
      });
      expect(response.message).toBe(responses.user_created);
      // TODO: fix this
      // const user = await User.findOne({ email: 'user@test.com' })
      // expect(user.isCreator).toBeTruthy()
      // expect(user.isAdmin).toBeTruthy()
      done();
    });

    it("signup but password field name is wrong", () => {
      expect.assertions(1);
      return promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: "user@test.com",
          pass: "lol",
        },
      }).then((data) => expect(data.message).toBe("Missing credentials"));
    });

    it("signup but name field is missing", () => {
      expect.assertions(1);
      return promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: "user@test.com",
          password: "lol",
        },
      }).then((data) => expect(data.message).toBe(responses.name_required));
    });

    it("signup with existing email", () => {
      expect.assertions(1);
      return promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: "user@test.com",
          password: "lol",
          name: "Tester",
        },
      })
        .then((val) =>
          promisify({
            url: `http://${apiUrl}/auth/signup`,
            form: {
              email: "user@test.com",
              password: "lol",
              name: "Tester #2",
            },
          })
        )
        .then((data) => {
          expect(data.message).toBe(responses.email_already_registered);
        });
    });

    // TODO: fix this testcase, beforeEach blocks are not running correctly
    it("only the first signup gets super admin rights", async (done) => {
      const user = "user@test.com";
      const user2 = "user2@test.com";
      expect.assertions(2);
      await promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: user,
          password: "lol",
          name: "Tester",
        },
      });
      // expect(userData.isCreator).toBeFalsy()
      // expect(userData.isAdmin).toBeFalsy()
      await promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: user2,
          password: "lol",
          name: "Tester",
        },
      });
      const user2Data = await User.findOne({ email: user2 });
      expect(user2Data.isCreator).toBeFalsy();
      expect(user2Data.isAdmin).toBeFalsy();
      done();
    });
  });

  describe("Signing in suite", () => {
    beforeAll((done) => {
      promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: "user@test.com",
          password: "lol",
          name: "Tester",
        },
      }).then(() => done());
    });

    afterAll((done) =>
      User.deleteOne({ email: "user@test.com" }, () => done())
    );

    it("non existing user", () => {
      expect.assertions(1);
      return promisify({
        url: `http://${apiUrl}/auth/login`,
        form: {
          email: "user3@test.com",
          password: "lol",
        },
      }).then((data) => {
        expect(data.message).toBe(responses.auth_user_not_found);
      });
    });

    it("wrong password", () => {
      expect.assertions(1);
      return promisify({
        url: `http://${apiUrl}/auth/login`,
        form: {
          email: "user@test.com",
          password: "lol2",
        },
      }).then((data) => {
        expect(data.message).toBe(responses.email_or_passwd_invalid);
      });
    });

    it("existing user", () => {
      expect.assertions(2);
      return promisify({
        url: `http://${apiUrl}/auth/login`,
        form: {
          email: "user@test.com",
          password: "lol",
        },
      }).then((data) => {
        expect(data).not.toHaveProperty("message");
        expect(data.token).toBeTruthy();
      });
    });
  });

  describe("Testing graphql endpoint security", () => {
    beforeAll((done) => {
      promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: "user@test.com",
          password: "lol",
          name: "Tester",
        },
      }).then(() => done());
    });

    afterAll((done) => {
      User.deleteOne({ email: "user@test.com" }, () => done());
    });

    // it('Hitting /graph endpoint with an unauthorized request', () => {
    //   expect.assertions(1)
    //     return promisify({
    //         url: `http://${apiUrl}/graph`,
    //         // form: {
    //         //     email: 'user2@test.com',
    //         //     password: 'lol'
    //         // }
    //   }, false).then(data => {
    //       expect(data).toBe(responses.passport_js_unauthorized)
    //   })
    // })

    it("Hitting /graph endpoint with an authorized request", () => {
      expect.assertions(2);
      return promisify({
        url: `http://${apiUrl}/auth/login`,
        form: {
          email: "user@test.com",
          password: "lol",
        },
      })
        .then((data) => data.token)
        .then((token) => {
          return promisify(
            {
              url: `http://${apiUrl}/graph`,
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
            false
          );
        })
        .then((data) => {
          try {
            const res = JSON.parse(data);
            expect(res).toHaveProperty("errors");
            expect(res.errors[0].message).toBe("Must provide query string.");
          } catch (err) {
            // do nothing
          }
        });
    });
  });
});
