"use strict";

const mt = require("../lib");

describe("Image testing suite", () => {
  test("the source is missing", async () => {
    await expect(mt.forImage()).rejects.toEqual(
      new Error("Source or destination path missing")
    );
  });

  test("the destination is missing", async () => {
    await expect(mt.forImage("./")).rejects.toEqual(
      new Error("Source or destination path missing")
    );
  });

  test("the source is imaginary", async () => {
    await expect(mt.forImage("/akkad/bakkad", "./")).rejects.toEqual(
      new Error("Non-zero exit code")
    );
  });
});
