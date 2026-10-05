import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {

    try {
        const form = await request.formData()
        const image = form.get('image') as File | null

        if (!image) {
            return NextResponse.json("No image provided", { status: 400 });
        }

    } catch (error) {
        console.error("Error", error);
    }
}
