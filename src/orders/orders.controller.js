const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass

function validateOrder(req, res, next) {
  const {
    data: { id, deliverTo, mobileNumber, dishes, status },
  } = req.body;
  const requiredFields = ["deliverTo", "mobileNumber", "dishes"];
  for (let i = 0; i < requiredFields.length; i++) {
    if (!req.body.data[requiredFields[i]]) {
      return next({ status: 400, message: `${requiredFields[i]} is missing` });
    }
  }
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return next({ status: 400, message: "dishes are invalid" });
  }
  res.locals.newOrder = { id, deliverTo, mobileNumber, dishes, status };
  return next();
}

function validateDishes(req, res, next) {
  const { dishes } = res.locals.newOrder;
  dishes.forEach((dish, index) => {
    if (
      !dish.quantity ||
      dish.quantity % 1 !== 0 ||
      typeof dish.quantity !== "number" ||
      dish.quantity < 0
    ) {
      next({
        status: 400,
        message: `dish ${index} must have a quantity that is an integer greater than 0.`,
      });
    }
  });
  next();
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find(
    (order) => Number(orderId) === Number(order.id)
  );
  if (foundOrder) {
    res.locals.foundOrder = foundOrder;
    return next();
  }
  return next({
    status: 404,
    message: `Order with id: ${orderId} does not exist `,
  });
}

function validateStatus(req, res, next) {
  const { status } = res.locals.newOrder;
  if (
    !(
      status === "pending" ||
      status === "preparing" ||
      status === "out-for-delivery"
    )
  ) {
    return next({
      status: 400,
      message: `status ${status} is invalid.`,
    });
  }
  next();
}

function checkId(req, res, next) {
  const { foundOrder, newOrder } = res.locals;

  if (!(Number(foundOrder.id) === Number(newOrder.id)) && newOrder.id) {
    return next({
      status: 400,
      message: `Order id does not match the route id. Order: ${newOrder.id}, Route: ${foundOrder.id}`,
    });
  }
  return next();
}

function validateDelete(req, res, next) {
  const { status } = res.locals.foundOrder;
  if (status === "pending") return next();
  return next({
    status: 400,
    message: `Delete not allowed for orders that are not pending`,
  });
}

function read(req, res) {
  const { foundOrder } = res.locals;
  res.status(200).json({ data: foundOrder });
}

function create(req, res) {
  const { newOrder } = res.locals;
  const id = nextId();
  res.status(201).json({ data: { ...newOrder, id: id } });
}

function list(req, res) {
  res.json({ data: orders });
}

function update(req, res) {
  const { newOrder, foundOrder } = res.locals;
  res.json({ data: { ...newOrder, id: foundOrder.id } });
}

function destroy(req, res) {
  // const { foundOrder } = res.locals;
  // const orderId = foundOrder.id;
  // const index = orders.findIndex((order) => order.id === Number(orderId));
  // const newOrders = orders.splice(index, 1);
  // res.json({ data: { ...newOrders } });
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [validateOrder, validateDishes, create],
  read: [orderExists, read],
  update: [
    orderExists,
    validateOrder,
    checkId,
    validateDishes,
    validateStatus,
    update,
  ],
  delete: [orderExists, validateDelete, destroy],
};
