import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import Mess from '@/models/Mess';

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
    }

    await connectToDatabase();
    // Ensure Mess schema is registered
    if (!Mess) {}

    const userDoc = await User.findOne({ firebaseUid: uid }).populate('messId', 'name status code');
    
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userObj = userDoc.toObject();
    const messStatus = userObj.messId && typeof userObj.messId === 'object' ? (userObj.messId.status || 'Active') : 'Active';

    return NextResponse.json({ 
      success: true, 
      user: { 
        ...userObj, 
        messStatus 
      } 
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
