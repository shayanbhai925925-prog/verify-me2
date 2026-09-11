import { NextRequest, NextResponse } from 'next/server';
import { runSecurityAgent, SupportedOperation } from '@/lib/securityAgent';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const operation = (formData.get('operation') as SupportedOperation) || 'ai_editing';
    const requesterApp = (formData.get('requesterApp') as string) || 'AI Editor Sandbox';

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await runSecurityAgent({
      imageBuffer: buffer,
      operation,
      requesterApp,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Security agent evaluation failed' },
      { status: 500 }
    );
  }
}
