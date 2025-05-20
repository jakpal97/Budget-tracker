import { NextResponse } from 'next/server'

export function middleware(req) {

	const response = NextResponse.next({
		request: {
			headers: new Headers(req.headers),
		},
	})

	return response
}
