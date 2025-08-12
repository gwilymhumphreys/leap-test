export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  fields?: Record<string, string>;
  errorId: string;
}

function generateErrorId(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function problem(
  status: number,
  title: string,
  detail: string,
  extras?: { fields?: Record<string, string>; type?: string }
): Response {
  const problemDetails: ProblemDetails = {
    type: extras?.type ?? `https://errors.local/${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    status,
    detail,
    errorId: generateErrorId(),
    ...(extras?.fields && { fields: extras.fields })
  };

  return new Response(JSON.stringify(problemDetails), {
    status,
    headers: {
      'Content-Type': 'application/problem+json'
    }
  });
}

export function ok<T>(data: T, initOverrides?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...initOverrides?.headers
    },
    ...initOverrides
  });
}