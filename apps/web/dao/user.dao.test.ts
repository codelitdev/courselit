import { UserDao } from "./user.dao";
import UserModel from "@models/User";
import mongoose from "mongoose";

afterEach(async () => {
  await UserModel.deleteMany({});
});

describe("UserDao", () => {
  let userDao: UserDao;

  beforeEach(() => {
    userDao = new UserDao();
  });

  it("should create a user", async () => {
    const userData = {
      email: "test@example.com",
      name: "Test User",
      userId: "123",
      unsubscribeToken: "token",
      domain: new mongoose.Types.ObjectId().toString(),
    };
    const user = await userDao.createUser(userData);
    expect(user).toBeDefined();
    expect(user.email).toBe(userData.email);
  });

  it("should get a user by id", async () => {
    const userData = {
      email: "test@example.com",
      name: "Test User",
      userId: "123",
      unsubscribeToken: "token",
      domain: new mongoose.Types.ObjectId().toString(),
    };
    await userDao.createUser(userData);
    const user = await userDao.getUserById("123", userData.domain);
    expect(user).toBeDefined();
    expect(user!.email).toBe(userData.email);
  });

  it("should get a user by email", async () => {
    const userData = {
      email: "test@example.com",
      name: "Test User",
      userId: "123",
      unsubscribeToken: "token",
      domain: new mongoose.Types.ObjectId().toString(),
    };
    await userDao.createUser(userData);
    const user = await userDao.getUserByEmail("test@example.com", userData.domain);
    expect(user).toBeDefined();
    expect(user!.email).toBe(userData.email);
  });

  it("should update a user", async () => {
    const userData = {
      email: "test@example.com",
      name: "Test User",
      userId: "123",
      unsubscribeToken: "token",
      domain: new mongoose.Types.ObjectId().toString(),
    };
    await userDao.createUser(userData);
    const updatedUser = await userDao.updateUser("123", userData.domain, {
      name: "Updated Test User",
    });
    expect(updatedUser).toBeDefined();
    expect(updatedUser!.name).toBe("Updated Test User");
  });
});
