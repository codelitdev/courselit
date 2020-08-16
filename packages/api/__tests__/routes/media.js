/**
 * @jest-environment node
 */
const mongoose = require("mongoose");
const promisify = require("../util.js").promisify;
require("../../src/config/db.js");
const User = require("../../src/models/User.js");
const Media = require("../../src/models/Media.js");
const strings = require("../../src/config/strings.js");
const fs = require("fs");
const path = require("path");
const request = require("request");

describe.skip("Media Test Suite", () => {
  const user = "uploader@test.com";
  const user2 = "uploader2@test.com";
  const pass = "lol";
  let token = "";
  let fileMediaID = "";
  let imageMediaID = "";
  let videoMediaID = "";

  afterAll((done) => {
    User.deleteMany({ email: { $in: [user, user2] } })
      .then(() =>
        Media.deleteMany({
          _id: {
            $in: [fileMediaID, imageMediaID, videoMediaID],
          },
        })
      )
      .then(() => {
        console.info(
          "Be sure to remove uploaded media from upload and thumbnail folders."
        );
        mongoose.connection.close();
        done();
      });
  });

  beforeAll((done) => {
    User.create([
      { email: user, password: pass, name: "Tester #1" },
      { email: user2, password: pass, name: "Tester #2" },
    ])
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
        token = res.token;
        done();
      });
  });

  it("Unauthenticated post request", () => {
    expect.assertions(1);
    return promisify(
      {
        url: `http://${apiUrl}/media`,
      },
      false
    ).then((data) => expect(data).toBe("Unauthorized"));
  });

  it("Not a creator", () => {
    return promisify({
      url: `http://${apiUrl}/media`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => {
      expect(res).toHaveProperty("message");
      expect(res.message).toBe(strings.responses.not_a_creator);
    });
  });

  it("Title not provided", async () => {
    await User.updateOne(
      { email: user },
      {
        isCreator: true,
      }
    );

    const res = await promisify({
      url: `http://${apiUrl}/media`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res).toHaveProperty("message");
    expect(res.message).toBe(strings.responses.title_is_required);
  });

  it("File not provided", async () => {
    const res = await promisify({
      url: `http://${apiUrl}/media`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      form: {
        title: "Sample File",
      },
    });
    expect(res).toHaveProperty("message");
    expect(res.message).toBe(strings.responses.file_is_required);
  });

  it("Upload a non-image, non-video file", async () => {
    const res = await promisify({
      url: `http://${apiUrl}/media`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      formData: {
        title: "Sample File",
        file: fs.createReadStream(path.join(__dirname, "/media.js")),
      },
    });
    expect(res).toHaveProperty("media");
    expect(res.message).toBe(strings.responses.success);

    const dbRecord = await Media.findById(
      mongoose.Types.ObjectId(res.media.id)
    );
    expect(dbRecord.thumbnail).toBeUndefined();
    expect(dbRecord.fileName).toContain("media");
    expect(dbRecord.mimeType).toBe("application/javascript");

    fileMediaID = res.media.id;
  });

  it("Upload an image file", async () => {
    const res = await promisify({
      url: `http://${apiUrl}/media`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      formData: {
        title: "Sample Image",
        file: fs.createReadStream(
          path.join(__dirname, "/../otherfiles/test_image.jpg")
        ),
      },
    });
    expect(res).toHaveProperty("media");
    expect(res.message).toBe(strings.responses.success);

    const dbRecord = await Media.findById(
      mongoose.Types.ObjectId(res.media.id)
    );
    expect(dbRecord.thumbnail).not.toBeUndefined();
    expect(dbRecord.fileName).toContain("image");
    expect(dbRecord.mimeType).toBe("image/jpeg");

    imageMediaID = res.media.id;
  });

  it("Upload a video file", async () => {
    const res = await promisify({
      url: `http://${apiUrl}/media`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      formData: {
        title: "Sample Video",
        file: fs.createReadStream(
          path.join(__dirname, "/../otherfiles/maple.mp4")
        ),
      },
    });
    expect(res).toHaveProperty("media");
    expect(res.message).toBe(strings.responses.success);

    const dbRecord = await Media.findById(
      mongoose.Types.ObjectId(res.media.id)
    );
    expect(dbRecord.thumbnail).not.toBeUndefined();
    expect(dbRecord.fileName).toContain("maple");
    expect(dbRecord.mimeType).toBe("video/mp4");

    videoMediaID = res.media.id;
  });

  it("get media", async (done) => {
    request.get(
      {
        url: `http://${apiUrl}/media/${imageMediaID}`,
      },
      (err, res, body) => {
        if (err) {
          // console.log(err);
        }

        expect(res.headers["content-type"]).toBe("image/jpeg");
        done();
      }
    );
  });

  it("deleting media from an unauthenticated request", async (done) => {
    request.delete(
      {
        url: `http://${apiUrl}/media/${imageMediaID}`,
      },
      (err, res, body) => {
        if (err) {
          // console.log(err);
        }

        expect(res.statusCode).toBe(401);
        done();
      }
    );
  });

  it("deleting media of some other user", async (done) => {
    const loginResponse = await promisify({
      url: `http://${apiUrl}/auth/login`,
      form: {
        email: user2,
        password: "lol",
      },
    });
    request.delete(
      {
        url: `http://${apiUrl}/media/${imageMediaID}`,
        headers: {
          Authorization: `Bearer ${loginResponse.token}`,
        },
      },
      (err, res, body) => {
        if (err) {
          // console.log(err);
        }

        expect(res.statusCode).toBe(404);
        done();
      }
    );
  });

  it("deleting image media", async (done) => {
    request.delete(
      {
        url: `http://${apiUrl}/media/${imageMediaID}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (err, res, body) => {
        if (err) {
          // console.log(err);
        }

        expect(res.statusCode).toBe(200);
        done();
      }
    );
  });

  it("deleting video media", async (done) => {
    request.delete(
      {
        url: `http://${apiUrl}/media/${videoMediaID}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (err, res, body) => {
        if (err) {
          // console.log(err);
        }

        expect(res.statusCode).toBe(200);
        done();
      }
    );
  });

  it("deleting a non-image, non-video media", async (done) => {
    request.delete(
      {
        url: `http://${apiUrl}/media/${fileMediaID}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (err, res, body) => {
        if (err) {
          // console.log(err);
        }

        expect(res.statusCode).toBe(200);
        done();
      }
    );
  });
});
