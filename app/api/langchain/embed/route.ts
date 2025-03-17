import embedDocsLangchain from '../embedDocs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { customDocs } = await request.json();

    if (!customDocs) {
      return NextResponse.json({ error: '没有提供文档内容' }, { status: 400 });
    }

    await embedDocsLangchain(customDocs, true);

    return NextResponse.json({ message: '文档处理成功' }, { status: 200 });
  } catch (error) {
    console.error('文档处理失败:', error);
    return NextResponse.json({ error: '文档处理失败' }, { status: 500 });
  }
}
