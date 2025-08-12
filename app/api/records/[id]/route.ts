import { z } from 'zod';
import { updateRecord, deleteRecord } from '@/lib/records';
import { ok, problem } from '@/lib/http';

// Ensure Node.js runtime for better-sqlite3 compatibility
export const runtime = 'nodejs';

// Validation schema for PATCH request body
const UpdateRecordSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').optional(),
  description: z.string().trim().min(1, 'Description cannot be empty').optional()
}).refine(
  data => data.title !== undefined || data.description !== undefined,
  { message: 'At least one field (title or description) must be provided' }
);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    // Parse and validate ID
    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) {
      return problem(
        400,
        'Bad request',
        'Invalid record ID'
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return problem(
        400,
        'Bad request',
        'Invalid JSON in request body'
      );
    }

    // Validate request body
    const parseResult = UpdateRecordSchema.safeParse(requestBody);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.errors.forEach(err => {
        if (err.path.length > 0) {
          fieldErrors[err.path[0] as string] = err.message;
        } else {
          // Handle root-level errors (like our custom refine)
          fieldErrors.general = err.message;
        }
      });
      
      return problem(
        422,
        'Validation error',
        'Invalid update data',
        { fields: fieldErrors }
      );
    }

    const updateData = parseResult.data;

    // Apply field truncation for consistency
    const MAX_TITLE_CHARS = parseInt(process.env.MAX_TITLE_CHARS ?? "200");
    const MAX_DESCRIPTION_CHARS = parseInt(process.env.MAX_DESCRIPTION_CHARS ?? "2000");

    const truncatedData: { title?: string; description?: string } = {};
    
    if (updateData.title !== undefined) {
      truncatedData.title = updateData.title.length > MAX_TITLE_CHARS 
        ? updateData.title.substring(0, MAX_TITLE_CHARS)
        : updateData.title;
    }
    
    if (updateData.description !== undefined) {
      truncatedData.description = updateData.description.length > MAX_DESCRIPTION_CHARS 
        ? updateData.description.substring(0, MAX_DESCRIPTION_CHARS) 
        : updateData.description;
    }

    // Update the record
    const updatedRecord = await updateRecord(id, truncatedData);
    return ok({ record: updatedRecord });

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return problem(
        404,
        'Not found',
        `Record with id ${params.id} not found`
      );
    }
    
    console.error('Error updating record:', error);
    return problem(
      500,
      'Internal server error',
      'Failed to update record'
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    // Parse and validate ID
    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) {
      return problem(
        400,
        'Bad request',
        'Invalid record ID'
      );
    }

    // Delete the record
    await deleteRecord(id);
    return ok({ ok: true });

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return problem(
        404,
        'Not found',
        `Record with id ${params.id} not found`
      );
    }
    
    console.error('Error deleting record:', error);
    return problem(
      500,
      'Internal server error',
      'Failed to delete record'
    );
  }
}