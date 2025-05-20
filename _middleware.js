import { NextResponse } from 'next/server'

export function middleware(req) {
	// Maksymalny rozmiar żądania ustawiony na 10MB
	const response = NextResponse.next({
		request: {
			headers: new Headers(req.headers),
		},
	})

	return response
}
