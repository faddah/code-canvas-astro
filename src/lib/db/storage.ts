import {
  files,
  starterFiles,
  userFiles,
  userProfiles,
  type File,
  type InsertFile,
  type StarterFile,
  type UserFile,
  type InsertUserFile,
  type UserProfile,
  type InsertUserProfile,
} from "../../shared/schema";
import { db } from "./index";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Legacy (backward compat — delegates to starter files)
  getFiles(): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<File>;
  deleteFile(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getFiles(): Promise<File[]> {
    return await db.select().from(files).orderBy(files.id);
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(insertFile).returning();
    return file;
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<File> {
    const [updatedFile] = await db
      .update(files)
      .set(updates)
      .where(eq(files.id, id))
      .returning();
    return updatedFile;
  }

  async deleteFile(id: number): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }
}

export const storage = new DatabaseStorage();
