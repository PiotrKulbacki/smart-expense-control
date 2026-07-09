import { NextResponse } from 'next/server';
import {
  getUserFromBearerToken,
  getUserFromSession,
  jsonError,
} from '@web/features/auth/services/auth.service';

export async function GET(request: Request) {
  try {
    const sessionUser = await getUserFromSession();
    if (sessionUser) {
      return NextResponse.json({ user: sessionUser });
    }

    const bearerUser = await getUserFromBearerToken(request.headers.get('authorization'));
    if (bearerUser) {
      return NextResponse.json({ user: bearerUser });
    }

    return jsonError('auth.errors.unauthorized', 401);
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
