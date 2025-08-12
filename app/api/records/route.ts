import { z } from 'zod';
import { listRecords, createRecord } from '@/lib/records';
import { ok, problem } from '@/lib/http';

// Ensure Node.js runtime for better-sqlite3 compatibility
export const runtime = 'nodejs';

// Validation schema for POST request body
const CreateRecordSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty'),
  description: z.string().trim().min(1, 'Description cannot be empty')
});

export async function GET() {
  try {
    const records = await listRecords();
    return ok({ records });
  } catch (error) {
    console.error('Error fetching records:', error);
    return problem(
      500,
      'Internal server error',
      'Failed to fetch records'
    );
  }
}

export async function POST(request: Request) {
  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return problem(
        400,
        'Bad request',
        'Invalid JSON in request body'
      );
    }

    // Validate request body
    const parseResult = CreateRecordSchema.safeParse(requestBody);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.errors.forEach(err => {
        if (err.path.length > 0) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      
      return problem(
        422,
        'Validation error',
        'Invalid record data',
        { fields: fieldErrors }
      );
    }

    const { title, description } = parseResult.data;

    // Apply field truncation for consistency with /api/run
    const MAX_TITLE_CHARS = parseInt(process.env.MAX_TITLE_CHARS ?? "200");
    const MAX_DESCRIPTION_CHARS = parseInt(process.env.MAX_DESCRIPTION_CHARS ?? "2000");

    const truncatedTitle = title.length > MAX_TITLE_CHARS 
      ? title.substring(0, MAX_TITLE_CHARS)
      : title;
    const truncatedDescription = description.length > MAX_DESCRIPTION_CHARS 
      ? description.substring(0, MAX_DESCRIPTION_CHARS) 
      : description;

    // Create the record
    const record = await createRecord({
      title: truncatedTitle,
      description: truncatedDescription
    });

    return ok({ record }, { status: 201 });

  } catch (error) {
    console.error('Error creating record:', error);
    return problem(
      500,
      'Internal server error',
      'Failed to create record'
    );
  }
}