import { describe, expect, it } from "bun:test";
import {
  LEARNER_AVATAR_MEDIA_ID_FIELD,
  LEARNER_AVATAR_URL_FIELD,
  LEARNER_BIO_FIELD,
  learnerProfileFromContact,
} from "./learner-profile.js";

describe("learner SendLit profile mapping", () => {
  it("maps subscription state and separate profile custom fields", () => {
    const profile = learnerProfileFromContact({
      contactId: "contact_1",
      email: "learner@example.com",
      name: "Learner",
      subscribed: false,
      customFields: {
        [LEARNER_BIO_FIELD]: "A learner bio",
        [LEARNER_AVATAR_MEDIA_ID_FIELD]: "med_01",
        [LEARNER_AVATAR_URL_FIELD]: "https://media.example/avatar.webp",
      },
      tags: ["learner"],
      createdAt: null,
      updatedAt: null,
    });

    expect(profile).toEqual({
      bio: "A learner bio",
      avatarMediaId: "med_01",
      image: "https://media.example/avatar.webp",
      emailUpdatesEnabled: false,
    });
  });

  it("returns empty profile values when a contact is not available", () => {
    expect(learnerProfileFromContact(null)).toEqual({
      bio: "",
      avatarMediaId: null,
      image: null,
      emailUpdatesEnabled: true,
    });
  });
});
