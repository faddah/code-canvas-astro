import {
  files,
  starterFiles,
  userFiles,
  userProfiles,
  projects,
  projectPackages, 
  insertProjectPackageSchema,
  type File,
  type InsertFile,
  type StarterFile,
  type UserFile,
  type InsertUserFile,
  type UserProfile,
  type InsertUserProfile,
  type Project,
  type InsertProject,
  type ProjectPackage,
  type InsertProjectPackage,
} from "../../shared/schema";
import { db } from "./index";
import { eq, and, isNull } from "drizzle-orm";

export interface IStorage {
  // Legacy (backward compat — delegates to starter files)
  getFiles(): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<File>;
  deleteFile(id: number): Promise<void>;

  // Starter files (read-only)
  getStarterFiles(): Promise<StarterFile[]>;
  getStarterFile(id: number): Promise<StarterFile | undefined>;

  // User files (scoped by clerkUserId)
  getUserFiles(clerkUserId: string): Promise<UserFile[]>;
  getUserFile(id: number, clerkUserId: string): Promise<UserFile | undefined>;
  createUserFile(file: InsertUserFile): Promise<UserFile>;
  updateUserFile(id: number, clerkUserId: string, updates: Partial<InsertUserFile>): Promise<UserFile>;
  deleteUserFile(id: number, clerkUserId: string): Promise<void>;

  // User profiles
  getUserProfile(clerkUserId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(clerkUserId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile>;
  deleteUserProfile(clerkUserId: string): Promise<void>;

  // Projects (scoped by clerkUserId)
  getProjects(clerkUserId: string): Promise<Project[]>;
  getProject(id: number, clerkUserId: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, clerkUserId: string, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number, clerkUserId: string): Promise<void>;
  getProjectFiles(projectId: number, clerkUserId: string): Promise<UserFile[]>;

  // Bulk operations
  deleteAllUserFiles(clerkUserId: string): Promise<void>;
  deleteAllProjectFiles(projectId: number, clerkUserId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Legacy methods (backward compat — operate on starter_files)
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

  // Starter files (read-only)
  async getStarterFiles(): Promise<StarterFile[]> {
    return await db.select().from(starterFiles).orderBy(starterFiles.id);
  }

  async getStarterFile(id: number): Promise<StarterFile | undefined> {
    const [file] = await db.select().from(starterFiles).where(eq(starterFiles.id, id));
    return file;
  }

  // User files (always scoped by clerkUserId for security)
  async getUserFiles(clerkUserId: string): Promise<UserFile[]> {
    return await db
      .select()
      .from(userFiles)
      .where(eq(userFiles.clerkUserId, clerkUserId))
      .orderBy(userFiles.id);
  }

  async getUserFile(id: number, clerkUserId: string): Promise<UserFile | undefined> {
    const [file] = await db
      .select()
      .from(userFiles)
      .where(and(eq(userFiles.id, id), eq(userFiles.clerkUserId, clerkUserId)));
    return file;
  }

  async createUserFile(insertFile: InsertUserFile): Promise<UserFile> {
    const [file] = await db.insert(userFiles).values(insertFile).returning();
    return file;
  }

  async updateUserFile(id: number, clerkUserId: string, updates: Partial<InsertUserFile>): Promise<UserFile> {
    const [updatedFile] = await db
      .update(userFiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(userFiles.id, id), eq(userFiles.clerkUserId, clerkUserId)))
      .returning();
    return updatedFile;
  }

  async deleteUserFile(id: number, clerkUserId: string): Promise<void> {
    await db
      .delete(userFiles)
      .where(and(eq(userFiles.id, id), eq(userFiles.clerkUserId, clerkUserId)));
  }

  // User profiles
  async getUserProfile(clerkUserId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.clerkUserId, clerkUserId));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateUserProfile(clerkUserId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [updated] = await db
      .update(userProfiles)
      .set(updates)
      .where(eq(userProfiles.clerkUserId, clerkUserId))
      .returning();
    return updated;
  }

  async deleteUserProfile(clerkUserId: string): Promise<void> {
    await db
      .delete(userProfiles)
      .where(eq(userProfiles.clerkUserId, clerkUserId));
  }

  // Projects (always scoped by clerkUserId for security)
  async getProjects(clerkUserId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.clerkUserId, clerkUserId))
      .orderBy(projects.id);
  }

  async getProject(id: number, clerkUserId: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.clerkUserId, clerkUserId)));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: number, clerkUserId: string, updates: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.clerkUserId, clerkUserId)))
      .returning();
    return updated;
  }

  async deleteProject(id: number, clerkUserId: string): Promise<void> {
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.clerkUserId, clerkUserId)));
  }

  async getProjectFiles(projectId: number, clerkUserId: string): Promise<UserFile[]> {
    return await db
      .select()
      .from(userFiles)
      .where(and(eq(userFiles.projectId, projectId), eq(userFiles.clerkUserId, clerkUserId)))
      .orderBy(userFiles.id);
  }

  // Bulk operations
  async deleteAllUserFiles(clerkUserId: string): Promise<void> {
    await db
      .delete(userFiles)
      .where(eq(userFiles.clerkUserId, clerkUserId));
  }

  async deleteAllProjectFiles(projectId: number, clerkUserId: string): Promise<void> {
    await db
      .delete(userFiles)
      .where(and(eq(userFiles.projectId, projectId), eq(userFiles.clerkUserId, clerkUserId)));
  }
}

export const storage = new DatabaseStorage();
