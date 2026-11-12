import { Router } from 'express';
import { getFacilities } from '../services/facilities.service.js';

export const facilitiesRouter = Router();

facilitiesRouter.get('/', async (req, res, next) => {
  try {
    const { 
      district, province, sector, cell, serviceName, isYouthFriendly, isIsange 
    } = req.query;
    
    const facilities = await getFacilities({ 
      district, province, sector, cell, serviceName, isYouthFriendly, isIsange 
    });
    
    res.json({ facilities });
  } catch (err) {
    next(err);
  }
});