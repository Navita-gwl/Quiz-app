import db from "../db.server";

/**
 * Generates a unique 8-character lowercase alphanumeric public ID for quizzes.
 * Characters: abcdefghijklmnopqrstuvwxyz0123456789
 * Trillions of combinations, checked for collision against existing categories.
 */
export async function generateUniquePublicId(): Promise<string> {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let attempts = 0;
  
  while (attempts < 100) {
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if the generated ID already exists in the database
    const existing = await db.category.findUnique({
      where: { quizPublicId: result }
    });
    
    if (!existing) {
      return result;
    }
    
    attempts++;
  }
  
  throw new Error("Could not generate a unique quizPublicId after 100 attempts");
}
