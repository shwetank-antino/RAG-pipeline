import { Router } from 'express';
import {upload} from '../../../utils/multerConfig.js';
import { uploadPdfController, getStatusController, queryController } from './rag.controller.js';

const router = Router();

router.post('/upload', upload.array('pdfs', 10), uploadPdfController);
router.get('/status', getStatusController);
router.post('/query', queryController);

export default router;