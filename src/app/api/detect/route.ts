import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof Blob)) {
            return NextResponse.json(
                { error: 'No valid image file provided.' },
                { status: 400 }
            );
        }

        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

        // Prepare outbound multipart form data for Python microservice
        const outboundFormData = new FormData();
        outboundFormData.append('file', file, (file as File).name || 'uploaded_image.png');

        try {
            const aiResponse = await fetch(`${aiServiceUrl}/detect`, {
                method: 'POST',
                body: outboundFormData,
            });

            if (!aiResponse.ok) {
                const errorData = await aiResponse.json().catch(() => ({}));
                return NextResponse.json(
                    {
                        error: errorData.detail || `AI service returned error ${aiResponse.status}`,
                    },
                    { status: aiResponse.status }
                );
            }

            const data = await aiResponse.json();
            return NextResponse.json({
                success: true,
                ...data,
            });
        } catch (fetchError: any) {
            console.error('Failed to communicate with AI microservice:', fetchError);
            return NextResponse.json(
                {
                    error: 'AI Detection microservice is unreachable. Please verify the Python service is running.',
                    offline: true,
                },
                { status: 503 }
            );
        }
    } catch (err: any) {
        console.error('Error in /api/detect route:', err);
        return NextResponse.json(
            { error: err.message || 'Internal server error during detection.' },
            { status: 500 }
        );
    }
}
