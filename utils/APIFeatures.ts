import AppError from "./AppError";

class APIFeatures {
  public query: any;
  public queryString: any;

  constructor(query: any,queryString: any) {
    this.query = query;
    this.queryString = queryString;
  }

    Filtering(): this {
      const queryObj = { ...this.queryString };

      const excludedFields = ["page", "sort", "limit", "fields"];
      excludedFields.forEach((el) => delete queryObj[el]);
      if (queryObj.stock_availability !== undefined) {
        queryObj.stock_availability = queryObj.stock_availability === "true";
      }
     this.query = this.query.find(queryObj);
      return this;
    }

  sorting(): this {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",");
      const allowedFields = ["name", "description", "status", "stock_availability", "createdAt", "updatedAt"];
      const allowedFieldsDesc = ["-name", "-description", "-status", "-stock_availability", "-createdAt", "-updatedAt"];

      const invalidFields = sortBy.filter((field: string) => !allowedFields.includes(field) && !allowedFieldsDesc.includes(field));

      if (invalidFields.length > 0) {
        throw new AppError(
          `Invalid sorting field(s): ${invalidFields.join(
            ", "
          )}. Allowed fields for Ascending order are: ${allowedFields.join(", ")} and Allowed fields for Descending order are: ${allowedFieldsDesc.join(", ")}`,
          400
        );
      }

      // Push the $sort stage to the aggregation pipeline
      this.query = this.query.sort(sortBy.join(" "));
    } else {
      // Default sorting by createdAt in descending order
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  fieldLimit(): this {
    if (this.queryString.fields) {
      // Split the fields and map them into a valid $project object
      const fieldsArray = this.queryString.fields.split(",");
      const allowedFields = ["name", "description", "status", "createdAt", "updatedAt","stock_availability"];

      // Step 3: Validate requested sort fields
      const invalidFields = fieldsArray.filter((field: string) => !allowedFields.includes(field));

      if (invalidFields.length > 0) {
        throw new AppError(
          `Invalid field(s): ${invalidFields.join(
            ", "
          )}. Allowed fields are: ${allowedFields.join(", ")}`,
          400
        );
      }
      this.query = this.query.select(fieldsArray);
    }
    return this;
  }


  paginate(): this {
    const page: number = parseInt(this.queryString.page, 10) || 1;
    const limit: number = parseInt(this.queryString.limit, 10) || 10;
    const skip: number = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

}

export default APIFeatures;
