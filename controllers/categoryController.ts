import e, { Request, Response, NextFunction } from "express";
import Category from "../models/categoryModel";
import APIFeatures from "../utils/APIFeatures";
import AppError from "../utils/AppError";
import mongoose from "mongoose";
import logger from "../utils/logger";

const catchAsync = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// Create a category
export const createCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Starting category creation...");

  const { parentId } = req.body;
  const parentDoc = await Category.findById(parentId);

  if (parentId && !parentDoc) {
    logger.error(`No parent category found for parentId: ${parentId}`);
    return next(new AppError("No parent found, please check parentId", 404));
  }

  const category = await Category.create(req.body);
  logger.info(`Category created with ID: ${category._id}`);

  if (parentId) {
    await Category.findByIdAndUpdate(
      parentId,
      { $push: { children: category._id } },
      { new: true, runValidators: true }
    );
    logger.info(`Parent category updated with child ID: ${category._id}`);
  }

  res.status(201).json({ status: "Success", data: category });
  logger.info("Category creation process completed successfully.");
});


// Create multiple categories
export const createMultipleChildCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Starting multiple category creation...");
  const { children } = req.body;

  if (!Array.isArray(children)) {
    logger.error("Children provided is not an array");
    return next(new AppError("Please provide an array of children to create", 400));
  }

  if (children.some((c: any) => !c.parentId)) {
    logger.error("One or more children do not have a parentId");
    return next(new AppError("Please provide a parentId for each child category", 400));
  }

  const parentIds = children.map((c: any) => c.parentId);
  const parentDocs = await Category.find({ _id: { $in: parentIds } });

  if (parentDocs.length !== new Set(parentIds).size) {
    logger.error("One or more parent categories not found");
    return next(new AppError("One or more parent categories not found. Please check the parentId values.", 404));
  }

  const createdCategories: any[] = [];
  for (const childData of children) {
    const category = await Category.create(childData);
    logger.info(`Child category created with ID: ${category._id}`);
    await Category.findByIdAndUpdate(
      childData.parentId,
      { $push: { children: category._id } },
      { new: true, runValidators: true }
    );
    logger.info(`Parent category updated with child ID: ${category._id}`);
    createdCategories.push(category);
  }

  res.status(201).json({
    status: "Success",
    data: createdCategories,
  });
});

// Get all categories
export const getCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Fetching all categories...");
  const features = new APIFeatures(req.query).Filtering().paginate().fieldLimit().sorting();

  const categories = await Category.aggregate([
    { $match: { parentId: "0" } },
    {
      $lookup: {
        from: "categories",
        localField: "children",
        foreignField: "_id",
        as: "children",
        pipeline: [
          {
            $lookup: {
              from: "categories",
              localField: "children",
              foreignField: "_id",
              as: "children",
              pipeline: [
                {
                  $lookup: {
                    from: "categories",
                    localField: "children",
                    foreignField: "_id",
                    as: "children",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    ...features.getPipeline(),
  ]);

  if (!categories.length) {
    logger.error("No categories found");
    return next(new AppError("No categories found", 404));
  }

  res.status(200).json({ status: "Success", results: categories.length, data: categories });
  logger.info(`Fetched ${categories.length} categories successfully`);
});

// Get category by ID
export const getCategoryByID = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Fetching category by ID: ${req.params.id}`);
  const category = await Category.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
    {
      $lookup: {
        from: "categories",
        localField: "children",
        foreignField: "_id",
        as: "children",
        pipeline: [
          {
            $lookup: {
              from: "categories",
              localField: "children",
              foreignField: "_id",
              as: "children",
              pipeline: [
                {
                  $lookup: {
                    from: "categories",
                    localField: "children",
                    foreignField: "_id",
                    as: "children",
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);

  if (!category.length) {
    logger.error(`Category not found with ID: ${req.params.id}`);
    return next(new AppError("Category not found with the provided ID.", 404));
  }

  res.status(200).json({ status: "Success", data: category });
  logger.info(`Category fetched successfully: ${req.params.id}`);
});

// Update category
export const updateCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Updating category with ID: ${req.params.id}`);
  const { parentId } = req.body;

  const currDoc = await Category.findById(req.params.id);
  if (!currDoc) {
    logger.error("Category not found for update");
    return next(new AppError("Category not found", 404));
  }

  if (parentId && parentId === req.params.id) {
    logger.error("Self-referencing category update attempt");
    return next(new AppError("A category cannot be its own parent", 400));
  }

  const updatedCategory = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "Success",
    data: ["Updated successfully", updatedCategory],
  });
  logger.info(`Category updated successfully: ${req.params.id}`);
});

// Delete category
export const deleteCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Deleting category with ID: ${req.params.id}`);
  const category = await Category.findById(req.params.id);

  if (!category) {
    logger.error("Category not found for deletion");
    return next(new AppError("Category not found, please provide valid ID", 404));
  }

  if (category.children.length) {
    logger.error("Attempt to delete category with child categories");
    return next(new AppError("This category has child categories. Please delete the children first.", 400));
  }

  await Category.findByIdAndDelete(req.params.id);
  res.status(200).json({ status: "Success", message: ["Deleted successfully", category] });
  logger.info(`Category deleted successfully: ${req.params.id}`);
});



// Delete multiple category
export const deleteMultipleCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Received request to delete multiple categories", { ids: req.body.ids });

  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    logger.error("No category IDs provided for deletion");
    return next(new AppError("Please provide an array of category IDs to delete.", 400));
  }

  const category = await Category.find({ _id: { $in: ids } });
  logger.info("Fetched categories for deletion", { categories: category });

  if (!category.length && category.some((cat) => !cat.id.length)) {
    logger.error("No categories found with the provided IDs");
    return next(new AppError("No categories found with the provided IDs", 404));
  }

  if (category.some((cat) => cat.children.length)) {
    logger.error("Attempt to delete categories with child categories");
    return next(new AppError("Some categories have child categories. Please delete the children first.", 400));
  }

  const parentUpdates = category
    .filter((cat) => cat.parentId) // Only update parents for categories with a parentId
    .map((cat) => ({
      updateOne: {
        filter: { _id: cat.parentId },
        update: { $pull: { children: cat._id } },
      },
    }));

  if (parentUpdates.length > 0) {
    logger.info("Updating parent categories to remove children references", { parentUpdates });
    await Category.bulkWrite(parentUpdates);
  }

  // Delete the categories
  await Category.deleteMany({ _id: { $in: ids } });
  logger.info("Categories deleted successfully", { deletedIds: ids });

  res.status(200).json({ status: "Success", deleteCount: category.length, message: ["Deleted successfully", category] });
});


// Search for categories
export const searchCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Received request to search categories", { key: req.params.key });

  const { key } = req.params;

  if (typeof key !== "string" || !isNaN(Number(key))) {
    logger.error(`Invalid search key provided: ${key}`);
    return next(new AppError(`The ${key} query parameter must be a string`, 400));
  }

  const regex = new RegExp(key, "i");
  logger.info("Performing search with regex", { regex: regex });

  const category = await Category.aggregate([
    { $match: { name: regex } },
    {
      $lookup: {
        from: "categories",
        localField: "children",
        foreignField: "_id",
        as: "children",
        pipeline: [
          {
            $lookup: {
              from: "categories",
              localField: "children",
              foreignField: "_id",
              as: "children",
              pipeline: [
                {
                  $lookup: {
                    from: "categories",
                    localField: "children",
                    foreignField: "_id",
                    as: "children",
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);

  logger.info("Search query result", { result: category });

  if (!category.length) {
    logger.error(`No categories found matching the search criteria for key: ${key}`);
    return next(new AppError(`No categories found matching the search criteria`, 400));
  }

  res.status(200).json({ status: "Success", data: category });
  logger.info("Search response sent successfully");
});
