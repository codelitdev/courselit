import { describe, expect, it } from "bun:test";
import { createPublicId, uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { textDoc } from "./test-content.js";

describe.serial("certificates", () => {
  it("saves one media asset when it is used for both certificate image roles", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-03T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
      "x-request-id": "req_certificate_media",
    };

    const createdProduct = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { title: "Certificate media course" },
    });
    expect(createdProduct.status).toBe(201);
    const productId = (createdProduct.body as { id: string }).id;
    const product = await runtime.db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.publicId, productId))
      .limit(1);
    const mediaInternalId = uuidv7(clock);
    const mediaId = createPublicId("med", clock);
    await runtime.db.insert(schema.media).values({
      id: mediaInternalId,
      publicId: mediaId,
      schoolId: world.schoolA.id,
      mediaLitId: "certificate-media-asset",
      canonicalUrl: "https://media.test/certificate.png",
      thumbnailUrl: null,
      fileName: "certificate.png",
      mimeType: "image/png",
      byteSize: 12,
      width: null,
      height: null,
      kind: "image",
      altText: "",
      caption: "",
      accessPolicy: "public",
      status: "active",
      createdBy: world.owner.id,
      createdByLearnerId: null,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    const saved = await dispatch(runtime, {
      method: "PUT",
      path: `/v1/products/${productId}/certificate-template`,
      headers: adminHeaders,
      body: {
        title: "Certificate of Completion",
        subtitle: "This certificate is awarded to",
        description: "for completing the course.",
        signatureName: "Instructor Name",
        signatureDesignation: "Course Instructor",
        signatureImageId: mediaId,
        logoId: mediaId,
      },
    });
    expect(saved.status).toBe(200);

    const template = await runtime.db
      .select({ id: schema.certificateTemplates.id })
      .from(schema.certificateTemplates)
      .where(eq(schema.certificateTemplates.productId, product[0]!.id))
      .limit(1);
    const references = await runtime.db
      .select({ mediaId: schema.mediaReferences.mediaId })
      .from(schema.mediaReferences)
      .where(eq(schema.mediaReferences.resourceInternalId, template[0]!.id));
    expect(references).toEqual([{ mediaId: mediaInternalId }]);
    await runtime.close();
  });

  it("issues one certificate when the learner completes every published lesson", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-02T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
      "x-request-id": "req_certificate",
    };

    const createdProduct = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { title: "Completion course", description: "Learn" },
    });
    expect(createdProduct.status).toBe(201);
    const productId = (createdProduct.body as { id: string }).id;
    await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "Free access", kind: "free", amountMinor: 0 },
    });
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { status: "published", certificate: true },
    });
    const productTemplate = await dispatch(runtime, {
      method: "PUT",
      path: `/v1/products/${productId}/certificate-template`,
      headers: adminHeaders,
      body: {
        title: "Course completion",
        subtitle: "This certifies that",
        description: "Completed every lesson.",
        signatureName: "Anita Simpson",
        signatureDesignation: "Instructor",
        signatureImageId: null,
        logoId: null,
      },
    });
    expect(productTemplate.status).toBe(200);
    expect(productTemplate.body).toMatchObject({
      productId,
      title: "Course completion",
      description: "Completed every lesson.",
      signatureName: "Anita Simpson",
    });
    const productTemplateId = (productTemplate.body as { id: string }).id;
    const loadedProductTemplate = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}/certificate-template`,
      headers: adminHeaders,
    });
    expect(loadedProductTemplate.status).toBe(200);
    expect(loadedProductTemplate.body).toMatchObject({ id: productTemplateId });
    const createdLesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers: adminHeaders,
      body: { title: "First lesson", content: textDoc("Start here") },
    });
    expect(createdLesson.status).toBe(201);
    const lessonId = (createdLesson.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${lessonId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });

    const template = await dispatch(runtime, {
      method: "POST",
      path: "/v1/certificate-templates",
      headers: adminHeaders,
      body: {
        name: "Standard certificate",
        template: { title: "Certificate of completion" },
      },
    });
    expect(template.status).toBe(201);

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        schoolId: world.schoolA.publicId,
        email: "learner@example.com",
        password: "learner-password-1",
        name: "Course Learner",
      },
    });
    expect(signedUp.status).toBe(201);
    const learnerCookie = signedUp.headers?.["Set-Cookie"];
    expect(learnerCookie).toBeString();
    const learnerHeaders = {
      cookie: learnerCookie as string,
      "x-school-id": world.schoolA.publicId,
    };

    const membership = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/memberships",
      headers: learnerHeaders,
      body: { productId },
    });
    expect(membership.status).toBe(201);
    const membershipId = (membership.body as { id: string }).id;
    const membershipRows = await runtime.db
      .select({ status: schema.learnerMemberships.status })
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.publicId, membershipId));
    expect(membershipRows).toEqual([{ status: "active" }]);

    const firstCompletion = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: learnerHeaders,
      body: {},
    });
    expect(firstCompletion.status).toBe(200);
    const certificateId = (firstCompletion.body as { certificateId: string })
      .certificateId;
    expect(firstCompletion.body).toMatchObject({
      courseCompleted: true,
      certificateId,
    });
    expect(certificateId).toMatch(/^cert_/);
    const issuedRows = await runtime.db
      .select({ templateId: schema.certificates.templateId })
      .from(schema.certificates)
      .where(eq(schema.certificates.publicId, certificateId));
    expect(issuedRows[0]?.templateId).not.toBeNull();

    const repeatedCompletion = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: learnerHeaders,
      body: {},
    });
    expect(repeatedCompletion.status).toBe(200);
    expect(repeatedCompletion.body).toMatchObject({
      courseCompleted: true,
      certificateId,
    });

    const certificates = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/certificates",
      headers: learnerHeaders,
    });
    expect(certificates.status).toBe(200);
    expect(certificates.body).toMatchObject({
      items: [
        {
          id: certificateId,
          productId,
          learnerName: "Course Learner",
          productTitle: "Completion course",
        },
      ],
    });
    const verificationId = (
      certificates.body as { items: Array<{ verificationId: string }> }
    ).items[0]!.verificationId;

    const verified = await dispatch(runtime, {
      method: "GET",
      path: `/v1/certificates/${verificationId}`,
      headers: {},
    });
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({
      id: certificateId,
      verificationId,
      schoolId: world.schoolA.publicId,
      title: "Course completion",
      subtitle: "This certifies that",
      description: "Completed every lesson.",
      signatureName: "Anita Simpson",
    });
    expect(verified.body).not.toHaveProperty("email");

    const blankTemplate = await dispatch(runtime, {
      method: "PUT",
      path: `/v1/products/${productId}/certificate-template`,
      headers: adminHeaders,
      body: {
        title: "",
        subtitle: "",
        description: "",
        signatureName: "",
        signatureDesignation: "",
        signatureImageId: null,
        logoId: null,
      },
    });
    expect(blankTemplate.status).toBe(200);

    const verifiedWithBlankTemplate = await dispatch(runtime, {
      method: "GET",
      path: `/v1/certificates/${verificationId}`,
      headers: {},
    });
    expect(verifiedWithBlankTemplate.status).toBe(200);
    expect(verifiedWithBlankTemplate.body).toMatchObject({
      title: "Certificate of Completion",
      subtitle: "This certificate is awarded to",
      description: "for completing the course.",
      signatureName: "Owner",
      signatureDesignation: null,
    });

    const publicCertificate = await runtime.db
      .select({ publicId: schema.certificates.publicId })
      .from(schema.certificates)
      .where(eq(schema.certificates.publicId, certificateId));
    expect(publicCertificate).toEqual([{ publicId: certificateId }]);

    const verifiedByCertificateId = await dispatch(runtime, {
      method: "GET",
      path: `/v1/certificates/${certificateId}`,
      headers: {},
    });
    expect(verifiedByCertificateId.status).toBe(200);
    expect(verifiedByCertificateId.body).toMatchObject({
      id: certificateId,
      verificationId,
    });

    const otherSchoolTemplates = await dispatch(runtime, {
      method: "GET",
      path: "/v1/certificate-templates",
      headers: { ...adminHeaders, "x-school-id": world.schoolB.publicId },
    });
    expect(otherSchoolTemplates.status).toBe(200);
    expect(otherSchoolTemplates.body).toEqual({ items: [] });
    await runtime.close();
  });
});
