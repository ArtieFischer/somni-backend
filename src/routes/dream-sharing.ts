import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../middleware/auth';
import { isAuthenticatedDev } from '../middleware/auth-dev';
import { dreamSharingService } from '../services/dream-sharing.service';
import { ShareDreamRequest, GetSharedDreamsParams } from '../types';

const router = Router();

// Use dev auth in development for testing
const authMiddleware = process.env.NODE_ENV === 'development' ? isAuthenticatedDev : isAuthenticated;

// Validation schemas
const shareDreamSchema = z.object({
  isAnonymous: z.boolean(),
  displayName: z.string().optional().nullable()
});

const getSharedDreamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
});

/**
 * POST /api/dreams/:dreamId/share
 * Share a dream publicly
 */
router.post('/dreams/:dreamId/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dreamId = req.params.dreamId;
    const userId = req.user!.id;

    // Validate request body
    const validationResult = shareDreamSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const shareRequest: ShareDreamRequest = validationResult.data;

    // Call service to share the dream
    const result = await dreamSharingService.shareDream(dreamId, userId, shareRequest);

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to share dream'
      });
    }

    return res.json({
      success: true,
      shareId: result.shareId,
      message: result.message
    });
  } catch (error) {
    console.error('Error in share dream endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/dreams/:dreamId/share
 * Stop sharing a dream
 */
router.delete('/dreams/:dreamId/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dreamId = req.params.dreamId;
    const userId = req.user!.id;

    // Call service to unshare the dream
    const result = await dreamSharingService.unshareDream(dreamId, userId);

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to unshare dream'
      });
    }

    return res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error in unshare dream endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/dreams/:dreamId/share
 * Update sharing settings for a dream
 */
router.patch('/dreams/:dreamId/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dreamId = req.params.dreamId;
    const userId = req.user!.id;

    // Validate request body
    const validationResult = shareDreamSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const updateRequest: ShareDreamRequest = validationResult.data;

    // Call service to update sharing settings
    const result = await dreamSharingService.updateDreamSharing(dreamId, userId, updateRequest);

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to update sharing settings'
      });
    }

    return res.json({
      success: true,
      shareId: result.shareId,
      message: result.message
    });
  } catch (error) {
    console.error('Error in update dream sharing endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/dreams/:dreamId/share/status
 * Get sharing status for a specific dream
 */
router.get('/dreams/:dreamId/share/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dreamId = req.params.dreamId;
    const userId = req.user!.id;

    // Get sharing status
    const status = await dreamSharingService.getDreamSharingStatus(dreamId, userId);

    return res.json({
      success: true,
      isShared: status.isShared,
      shareDetails: status.shareDetails
    });
  } catch (error) {
    console.error('Error in get sharing status endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/shared-dreams
 * Get all publicly shared dreams (no auth required)
 */
router.get('/shared-dreams', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validationResult = getSharedDreamsSchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      });
    }

    const params: GetSharedDreamsParams = validationResult.data;

    // Call service to get shared dreams
    const result = await dreamSharingService.getPublicSharedDreams(params);

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to fetch shared dreams'
      });
    }

    return res.json({
      success: true,
      dreams: result.dreams,
      total: result.total
    });
  } catch (error) {
    console.error('Error in get shared dreams endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;