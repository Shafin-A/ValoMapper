export const POST = async () => {
  const response = await fetch(`${process.env.API_URL}/lobbies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    return Response.json(
      { error: "Failed to create lobby" },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json(data);
};
