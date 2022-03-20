import type { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import passport from 'passport';
import { responses } from '../../config/strings';
import { checkPermission, getMediaOrThrow } from '../../lib/graphql';
import jwtStrategy from '../../lib/jwt';
import verifyDomain from '../../middlewares/verify-domain';
import ApiRequest from '../../models/ApiRequest';
import Media from '../../models/Media';
import connectToDatabase from '../../services/db';

passport.use(jwtStrategy)

const getHandler = async (req: ApiRequest, res: NextApiResponse) => {
  let media;

  try {
    media = await Media.findOne({
      _id: req.params.mediaId,
      domain: req.subdomain!._id,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }

  if (!media) {
    return res.status(404).json({ message: responses.item_not_found });
  }

  await manageOnCloud.serve({ media, res });
};

const postHandler = async (req: ApiRequest, res: NextApiResponse) => {
  req.socket.setTimeout(10 * 60 * 1000);

  if (
    !checkPermission(req.user!.permissions, [constants.permissions.uploadMedia])
  ) {
    return res.status(400).json({ message: responses.action_not_allowed });
  }

  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: responses.file_is_required });
  }

  if (req.files.file.size > maxFileUploadSize) {
    return res.status(400).json({ message: responses.file_size_exceeded });
  }

  await manageOnCloud.upload(req, res);
};

const deleteHandler = async (req: ApiRequest, res: NextApiResponse) => {
  let media;

  try {
    media = await getMediaOrThrow(req.params.mediaId, req);
  } catch (err: any) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  await manageOnCloud.delete(media, res);
};

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
      res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
      res.status(404).end("Not found")
    },
})
    .use(passport.initialize())
    .use(async (req: NextApiRequest, res: NextApiResponse, next) => {
        await connectToDatabase();
        await verifyDomain(req, res)
        next()
    })