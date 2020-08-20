# Introduction

> Create thumbnails from your image and video files for your Node.js based application.

For generating thumbnails, this package uses imagemagick (for images) and ffmpeg (for videos) utilities, so make sure those are installed on your machine before using this package.

_Note: This module will always overwrite the thumbnail file, if already exists._

### Features

1. Promise based API
2. Supports both images and videos

## Install

```
npm install @courselit/thumbnail
```

**NOTE**: You need to have the following softwares installed on your machine to use this package. For Ubuntu, the command is listed.

```
apt install imagemagick ffmpeg
```

## Usage

With default options

```
const mt = require('@courselit/thumbnail')

mt.forImage(
  './path/to/file.png',
  './path/to/thumb.png')
  .then(() => console.log('Success'), err => console.error(err))
```

With custom options

```
const mt = require('@courselit/thumbnail')

mt.forImage(
  './path/to/file.png',
  './path/to/thumb.png',
  {
    width: 100,
    height: 100,
    preserveAspectRatio: false
  })
  .then(() => console.log('Success'), err => console.error(err))
```

## API

### forImage(source, destination, [options])

**source**

An absolute or relative path to the original image.

**destination**

An absolute or relative path to the thumbnail folder.

**options**

1. width [number]: Preferred width of the thumbnail. Defaults to '100'.
2. height [number]: Preferred height of the thumnail. Defaults to '100'.
3. preserveAspectRatio [boolean]: If set to `false`, only then the resulting thumbnail will be of specified width x height. Otherwise the width of the resulting thumbnail would be min(width, height) and the aspect ratio will be preserved. Defaults to `true`.

### forVideo(source, destination, [options])

**source**

An absolute or relative path to the original video.

**destination**

An absolute or relative path to the thumbnail folder.

**options**

1. width [number]: Preferred width of the thumbnail. Defaults to '100'.
2. height [number]: Preferred height of the thumnail. Defaults to '-1'. This default preserves the aspect ratio.
