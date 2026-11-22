# Changelog

## [1.0.0-alpha.1](https://github.com/codelitdev/courselit/compare/v1.0.0-alpha.0...v1.0.0-alpha.1) (2026-11-22)


### ⚠ BREAKING CHANGES

* **api:** updateLesson content writes no longer change the content learners read until the draft is published.
* **api:** text, video, audio, pdf, embed and quiz lesson types and the downloadable flag are gone
* products no longer have `newLessonStatus`, and a lesson created without a status is always a draft.

### Features

* add report this site, an acceptable use policy and reserved subdomains ([8cbe973](https://github.com/codelitdev/courselit/commit/8cbe973becc43bf58d4501fc76410c3e8c7499b0))
* add school-scoped learner saml single sign-on ([f9c0e03](https://github.com/codelitdev/courselit/commit/f9c0e037f0baf407185d807a028c50d83d63ea59))
* add school-scoped learner saml single sign-on ([3c9f280](https://github.com/codelitdev/courselit/commit/3c9f280eaa52c5c3be2989eb2801b35856e189f7))
* add youtube videos to community posts ([42a776f](https://github.com/codelitdev/courselit/commit/42a776fbfb4ceb29abaffca10a4e6691a4bd9b78))
* **admin,storefront:** keep lesson authoring and viewing working with pages ([ff48f80](https://github.com/codelitdev/courselit/commit/ff48f80899197d6812db257c13197329ad02d238))
* **admin:** add a tags page built on SendLit's TagManager ([87efc1b](https://github.com/codelitdev/courselit/commit/87efc1b33686e10ece23aee3f18f1324b393d0d4))
* **admin:** edit lesson pages with the block editor ([3114897](https://github.com/codelitdev/courselit/commit/3114897e7a45d6b35c40123b0b6d50053caf410c))
* **admin:** edit lesson pages with the block editor ([6565541](https://github.com/codelitdev/courselit/commit/65655414c66e7ce22011e22a5e45a04bfa6aa87e))
* **admin:** publish and discard lesson drafts from the editor ([31c619c](https://github.com/codelitdev/courselit/commit/31c619c445f514da87dc9d3c6aec225f2f4671fa))
* **admin:** show what each plan includes when picking one ([201349b](https://github.com/codelitdev/courselit/commit/201349ba19b6ad5bc60b10cecdcc2e47041cc881))
* **admin:** split a running sequence into overview and edit tabs ([fb7d34e](https://github.com/codelitdev/courselit/commit/fb7d34ec9e3d2d6b12e18bdf4e228356998b2a35))
* **admin:** write page lessons in a full-screen editor ([26d4ba8](https://github.com/codelitdev/courselit/commit/26d4ba8259a46043a08f1ecb0efa585fe3f7d5d4))
* **admin:** write page lessons in a full-screen editor ([fc9ac7e](https://github.com/codelitdev/courselit/commit/fc9ac7ea4baf26a7b316be9e53c0c0ab3374eeda))
* **api:** bill school plans through lemon squeezy instead of dodo ([ef14c01](https://github.com/codelitdev/courselit/commit/ef14c0185ea9c1b0236f981e7e9a11d83e4ca53f))
* **api:** grade quizzes by id and guard lesson content writes ([4d1e9f8](https://github.com/codelitdev/courselit/commit/4d1e9f8d55494b5694abcadbae580603687f4a48))
* **api:** grade quizzes by id and guard lesson content writes ([4c72805](https://github.com/codelitdev/courselit/commit/4c728056bfe4c9760b40574ad8bb952809711d58))
* **api:** make lessons block-based pages ([10c7ef4](https://github.com/codelitdev/courselit/commit/10c7ef4b56a4bb54a43909d5d1b4cabadd78959f))
* **api:** mark access grants and community invites as open-world ([d70e00f](https://github.com/codelitdev/courselit/commit/d70e00f7b9406b15b33883bb0dc109a13f3b6958))
* **api:** mark mcp tools that reach outside the school as open-world ([a37976d](https://github.com/codelitdev/courselit/commit/a37976d60ba0aa035dca1c818ee59ab86a2b6c08))
* **api:** name openapi operations after their contract keys ([6189761](https://github.com/codelitdev/courselit/commit/618976115351706ff82e63d71e37dc2aa7acfd8d))
* **api:** pick the platform billing provider by settings, so school plans can bill through dodo ([6839838](https://github.com/codelitdev/courselit/commit/6839838533413b35e8f1bb52e183eaff1d594d56))
* **api:** save lesson page writes as drafts until published ([18fd6cf](https://github.com/codelitdev/courselit/commit/18fd6cf9ca618dc20445671744885a7abc30dedf))
* **api:** school states, schoolPlan and plan limits for courselit plans ([7e7fd71](https://github.com/codelitdev/courselit/commit/7e7fd71d273a2cd43c9d179cc098702a74add34c))
* **api:** send learner mail through platform streams with caps and abuse limits ([00f0545](https://github.com/codelitdev/courselit/commit/00f0545ceb6bd837700dbf67e1cf2075a9c6cbb0))
* **api:** send learner mail under the school's name ([9380a2b](https://github.com/codelitdev/courselit/commit/9380a2bc8e7a1c1f76c2de3181896dabdf43018b))
* **api:** send product analytics, errors and logs to posthog ([6c4a728](https://github.com/codelitdev/courselit/commit/6c4a728883bc492d79df40fe5e67ee19e8ccc846))
* **api:** send product analytics, errors and logs to posthog ([56b72ec](https://github.com/codelitdev/courselit/commit/56b72ec03979dab2eb8dde555317566e84a7c925))
* **api:** send replies to a school's marketing email to its owner ([c47917b](https://github.com/codelitdev/courselit/commit/c47917b63e713ecaf539ceab6e8c001a1f2a0a5d))
* **api:** send replies to a school's marketing email to its owner ([3716426](https://github.com/codelitdev/courselit/commit/3716426a9b2732f7c2039b287bd8146516a649b9))
* **api:** set sendlit marketing quotas from the school's plan ([50c5d1f](https://github.com/codelitdev/courselit/commit/50c5d1fabd00ecafc7a8bdd66f8da0bb701cf653))
* close tracker items 22-41 and version the rewrite as 1.0.0-alpha ([cf566cf](https://github.com/codelitdev/courselit/commit/cf566cfaa75fb39c0d0969a12075007aca3c3ea2))
* **community:** label edited posts and comments ([38e49d6](https://github.com/codelitdev/courselit/commit/38e49d6da289b2baa66b66875f10d2f6d5401f6b))
* **community:** label edited posts and comments ([2df1f93](https://github.com/codelitdev/courselit/commit/2df1f9314d5549c15ebe5818cdaa1403f648a451))
* courselit plans, trials and limits ([ec7ce30](https://github.com/codelitdev/courselit/commit/ec7ce307028b924e5a2654b85120155215e36ca4))
* enforce storage limits at finalize and give learners a budget ([be17592](https://github.com/codelitdev/courselit/commit/be175923baded483a3948f32bea52ca05d3059a1))
* **frontlit:** add marketing site pages, theme and navigation ([deb753a](https://github.com/codelitdev/courselit/commit/deb753a74b779e06c0028d25ee5f4b11c90123ff))
* **frontlit:** add marketing site pages, theme and navigation ([52d9b76](https://github.com/codelitdev/courselit/commit/52d9b7633148b93d3837d7e15c522da5b8d1aa77))
* **frontlit:** add product mock-ups, backgrounds and pricing switch ([465b76e](https://github.com/codelitdev/courselit/commit/465b76ed011e35042a8896362dd45ca6f30bc699))
* **frontlit:** lead the product picker with communities ([fc9cdc8](https://github.com/codelitdev/courselit/commit/fc9cdc8300b223e452d72a4ea074bc24d90b0fe5))
* **frontlit:** publish llms.txt facts for ai assistants ([9b50478](https://github.com/codelitdev/courselit/commit/9b5047878119e09f4cc8c17a921ef55c50800265))
* **frontlit:** put the pro plan in the middle of the pricing cards ([f718a5d](https://github.com/codelitdev/courselit/commit/f718a5d5652a16e6d0c9fd3d4efb5f4c77ce8bf2))
* **frontlit:** redesign the homepage around the creator journey ([7eb8b8a](https://github.com/codelitdev/courselit/commit/7eb8b8adcfea1d2a69f90c62c810a13ca4f8e4c9))
* **frontlit:** send beta sign-ups to the qa admin and list pro email support ([3ea2873](https://github.com/codelitdev/courselit/commit/3ea2873aa6d525c28ac54c7263860e7d3f9f0516))
* **lesson-content:** add the lesson page profile and quiz block ([c13af54](https://github.com/codelitdev/courselit/commit/c13af542ad889e3f4d14774e08f41d89fcd62be5))
* limit invites to 50 a day and 200 pending per school ([011ad37](https://github.com/codelitdev/courselit/commit/011ad377283b89b05ede44379519571b2dd88155))
* set plan limits by environment; pro $29 with unlimited storage ([5a0c680](https://github.com/codelitdev/courselit/commit/5a0c6802306048afe2fdbe07c052efbc43e18cc3))
* show plan usage and warn the owner at 80% of a limit ([9660d65](https://github.com/codelitdev/courselit/commit/9660d65f8e3ba37fe981bacef71ad680aff6b468))
* **storefront:** list course discussions apart from community spaces ([a22ef8d](https://github.com/codelitdev/courselit/commit/a22ef8dd3d0a36c1a11792a10271a896946944a3))
* **storefront:** render lesson pages with themed blocks and an in-page quiz ([3dacc03](https://github.com/codelitdev/courselit/commit/3dacc033b7107809443abca45ad419e553ca850c))
* **storefront:** render lesson pages with themed blocks and an in-page quiz ([38ac848](https://github.com/codelitdev/courselit/commit/38ac848a548894f1e410da18c68331751ab96244))
* trials, school lifecycle, plan features and the courselit badge ([3730ac0](https://github.com/codelitdev/courselit/commit/3730ac0cf4aa1d2b5c72a37b82e8c8b0cc674cb3))


### Bug Fixes

* admin and community fixes, youtube videos in posts ([d389794](https://github.com/codelitdev/courselit/commit/d389794d43cf4852408f914857e73bfa9dd3c36f))
* **admin:** don't report undone lesson setting changes as unsaved ([b48ea16](https://github.com/codelitdev/courselit/commit/b48ea16bc92cbde9cd613a7541aed75e1eeec6d1))
* **admin:** drop the mailing address banner from the broadcast editor ([40b0dc7](https://github.com/codelitdev/courselit/commit/40b0dc7d5912a7c9e3a40fa3409a9f2200634f94))
* **admin:** drop the scorm alpha tag and keep one settings close button ([b63131e](https://github.com/codelitdev/courselit/commit/b63131e45a88ce6ad3055a728b0cfa72897ef11f))
* **admin:** keep the admin's name out of onboarding email previews ([476e626](https://github.com/codelitdev/courselit/commit/476e626d7bb8fe6f27558b2be24f14ca14a6552f))
* **admin:** keep the admin's name out of onboarding email previews ([45a42ca](https://github.com/codelitdev/courselit/commit/45a42ca288f026b172881df1413afcb190fd81f3))
* **admin:** line up the payment method field with its reset button ([e6fe75f](https://github.com/codelitdev/courselit/commit/e6fe75fbc67bfb704bd7235825f9a60a2a4080dd))
* **admin:** put the setup wizard's scrollbar on the pane's edge ([cc733af](https://github.com/codelitdev/courselit/commit/cc733afaffe8356063efd881292faffb43ed8c39))
* **admin:** restore dialog header spacing via design-system 0.15.0 ([37e61d0](https://github.com/codelitdev/courselit/commit/37e61d01622ccfb4201d512d1782eee95e75a247))
* **admin:** restore dialog header spacing via design-system 0.15.0 ([8707c44](https://github.com/codelitdev/courselit/commit/8707c4423454be9639f1b924120373033d70fbbf))
* **admin:** stop the broadcast email preview reloading while typing ([c625b6c](https://github.com/codelitdev/courselit/commit/c625b6c65b9c31cf1d1d0a018a54ef4e08d95cf3))
* **admin:** stop the lesson editor sticking on saving after creating a media lesson ([4984176](https://github.com/codelitdev/courselit/commit/4984176f1e5ebc16bafd5a76e3c319d22d709f15))
* **api-contract:** stop choosing every option from passing a quiz ([2098c7d](https://github.com/codelitdev/courselit/commit/2098c7d6e23b0ba09f6422aa8d0d0f5e11c904d6))
* **api:** allow learner uploads only where the learner can post ([3d67c6b](https://github.com/codelitdev/courselit/commit/3d67c6bb153b132798fdbe218194660daac2e2fa))
* **api:** count finished learner uploads toward the hourly limit ([6a5b70f](https://github.com/codelitdev/courselit/commit/6a5b70fcfa7478240ae47e6d4b3ac10a14885529))
* **api:** drop @ and invisible characters from a school's sender name ([6c63a95](https://github.com/codelitdev/courselit/commit/6c63a95c01f4e5ebac6b386329ca1ba9d85535ad))
* **api:** hide deleted comments that have no live replies ([89acf07](https://github.com/codelitdev/courselit/commit/89acf07790c0fd55ddbfcb0f69c4f7190add8a7f))
* **api:** keep a new sendlit team when a later provisioning step fails ([8452366](https://github.com/codelitdev/courselit/commit/8452366527c4018a77883098302f40efa6515df9))
* **api:** keep scorm package details as lesson content ([2c2c190](https://github.com/codelitdev/courselit/commit/2c2c1906dcba949a53728a468fc7b6c2bf3bfa11))
* **api:** let learners upload media in course discussions ([83640f4](https://github.com/codelitdev/courselit/commit/83640f4dad81854a155141c80c03c40d283c5db8))
* **api:** register the payment webhook again when it is gone at the provider ([656015e](https://github.com/codelitdev/courselit/commit/656015ea75280e469c6a6e8713ad462d6ba80701))
* **api:** start empty templates from sendlit's blank and require a sequence type ([bfabcae](https://github.com/codelitdev/courselit/commit/bfabcaef695060ce53bace41eae5dcf9d06b0f90))
* drop the redundant fullscreen attribute on youtube embeds ([a361b18](https://github.com/codelitdev/courselit/commit/a361b18568973aa3420f560b3ff5f5f0d5029757))
* **frontlit:** add space above the chalkboard small print ([7bfe9eb](https://github.com/codelitdev/courselit/commit/7bfe9eb001d155a75303de5af3dbab7fa7681836))
* **frontlit:** drop a stray protocol-relative link from the terms page ([ceedcb1](https://github.com/codelitdev/courselit/commit/ceedcb1c0f4029dfd6d26861da62cf47a13f1849))
* **frontlit:** link the privacy policy from the terms page ([4c598a6](https://github.com/codelitdev/courselit/commit/4c598a6e2b9bbf31c72c6e1210c6f7b1a52828c5))
* **frontlit:** nest llms.txt sections under frontlit's heading ([359b35d](https://github.com/codelitdev/courselit/commit/359b35dfcaa975a8c68e26f4ae524a8dc46a80c3))
* **frontlit:** nest llms.txt sections under frontlit's heading ([02f9ed3](https://github.com/codelitdev/courselit/commit/02f9ed3e24d2c1b10b45518fbcec9671c580ae4b))
* **frontlit:** spell the product picker's more-about links correctly ([4c5bb55](https://github.com/codelitdev/courselit/commit/4c5bb555045ce88dd7ab794723eaa30e2a40e0b6))
* harden sign-in, sessions, proxies and webhooks ([d80defd](https://github.com/codelitdev/courselit/commit/d80defd51d7ff4356ed36f8358d560cbbdf9a3a7))
* payment webhook recovery, certificate sign-in link and mail editor polish ([ce0ab66](https://github.com/codelitdev/courselit/commit/ce0ab668f4ea2b0c1e46591c433b83bb060e7069))
* **storefront:** don't tell enrolled learners they aren't enrolled ([eec0a14](https://github.com/codelitdev/courselit/commit/eec0a14aa07b619e77dbe4f9ab4c2dd1d69f9cdc))
* **storefront:** hide learner sign in on certificates for signed-in learners ([df01e00](https://github.com/codelitdev/courselit/commit/df01e001411bd29a716f6dfbdea692249fbf6f0f))
* **storefront:** keep the courselit strip off printed pages and the badge off certificates ([f391517](https://github.com/codelitdev/courselit/commit/f391517f6ca3b7c3dc16c462d4b36ec1a33c7998))
* **storefront:** keep the courselit strip off printed pages and the badge off certificates ([56546ec](https://github.com/codelitdev/courselit/commit/56546ecbe4f22d9c0aa92c83670186d97c4017e7))
* **storefront:** say an empty lesson has no content in preview too ([acde705](https://github.com/codelitdev/courselit/commit/acde705d7b99ba2c6c52aab85fe4a78cfb4ac870))
* **storefront:** show comment attachments uncropped with room around them ([fe188e2](https://github.com/codelitdev/courselit/commit/fe188e2bbb654ea30bcf93386c0f90157e32f752))
* **storefront:** style the media upload dialog ([dfdbf6e](https://github.com/codelitdev/courselit/commit/dfdbf6e14ecb64d9a15507a4558a8c89347f0b63))


### Performance Improvements

* **api:** start each test database from one migrated snapshot ([761336a](https://github.com/codelitdev/courselit/commit/761336a42a2f8f84f989e4623d11228cb98f0eba))
* **api:** start each test database from one migrated snapshot ([499ed6e](https://github.com/codelitdev/courselit/commit/499ed6e17de6ab76887d953372b658db7993fdb4))


### Code Refactoring

* start every new lesson as a draft ([51cf66c](https://github.com/codelitdev/courselit/commit/51cf66c8d265e9411059fa2fbaeb37f7aef4e33b))
