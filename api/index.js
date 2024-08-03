// app.js
const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    // Sanitize input
    const sanitizedUsername = username.trim();
    const sanitizedPassword = password.trim();

    if (handleData1(sanitizedUsername, sanitizedPassword)) {
        return res.json({ status: 'fail', message: 'Error in incoming data' });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                Username: sanitizedUsername,
            },
        });

        if (!user) {
            return res.json({ status: 'fail', message: 'password or username is incorrect' });
        }

        const isPasswordValid = bcrypt.compareSync(sanitizedPassword, user.Password);

        if (!isPasswordValid) {
            return res.json({ status: 'fail', message: 'password or username is incorrect' });
        }

        // Remove the password from the user object before sending it to the client
        const { Password, ...userWithoutPassword } = user;

        return res.json({ status: 'success', user: userWithoutPassword });
    } catch (error) {
        console.error(error);
        return res.json({ status: 'fail', message: 'something went wrong' });
    }
});

function handleData1(username, password) {
    if ((username.length < 5) || (password.length < 8)) {
        return true;
    }
    return false;
}
function handleData(username, email, phone, password) {
  return (
    !username || username.length < 5 ||
    !email || !email.endsWith('.com') || !email.includes('@') ||
    !phone || phone.length < 9 ||
    !password || password.length < 8
  );
}

app.post('/auth/signup', async (req, res) => {
  const { username, password, phone, email } = req.body;

  if (handleData(username, email, phone, password)) {
    return res.status(400).json({ status: 'fail', message: 'Error in incoming data' });
  }

  try {
    const existingUser = await prisma.user.findFirst({ where: { Username: username } });

    if (existingUser) {
      return res.status(400).json({ status: 'fail', message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        Username: username,
        Email:email,
        Phone:phone,
        Password: hashedPassword,
      },
    });

    res.status(201).json({ status: 'success', user: newUser });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: `something went wrong ${error}` });
  }
});

function isValidId(id) {
  return isNaN(id);
}

// Get Account by ID Route
app.get('/auth/getAccountById', async (req, res) => {
  const id = req.query.id;

  if (!isValidId(id)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid ID' });
  }

  try {
    const account = await prisma.user.findUnique({
      where: {
        Id: id,
      },
    });

    if (account) {
      res.status(200).json({ status: 'success', account: account });
    } else {
      res.status(404).json({ status: 'fail', message: 'Account not found' });
    }
  } catch (error) {
    res.status(500).json({ status: 'fail', message: `Something went wrong ${error}` });
  }
});

function handleData3(username, email, phone) {
  return (
    !username || username.length < 5 ||
    !email || !email.endsWith('.com') || !email.includes('@') ||
    !phone || phone.length < 9
  );
}

// Update Account Route
app.put('/auth/updateAccount', async (req, res) => {
  const { id: accountId, username, password, oldPassword, phone, email } = req.body;

  if (handleData3(username, email, phone)) {
    return res.status(400).json({ status: 'fail', message: 'Error in incoming data' });
  }

  try {
    const account = await prisma.user.findUnique({
      where: { Id: accountId },
    });

    if (!account) {
      return res.status(404).json({ status: 'fail', message: 'Account not found' });
    }

    const newUsername = username || account.username;
    const newEmail = email || account.email;
    const newPhone = phone || account.phone;

    const existingUser = await prisma.user.findFirst({
      where: {
        AND: [
          { Username: newUsername },
          { Id: { not: accountId } },
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({ status: 'fail', message: 'The user already exists' });
    }

    let hashedPassword = account.password;

    if ((oldPassword && !password) || (!oldPassword && password)) {
      return res.status(400).json({ status: 'fail', message: 'One of Passwords is empty' });
    }

    if (oldPassword && password) {
      const match = await bcrypt.compare(oldPassword, account.password);
      if (!match) {
        return res.status(400).json({ status: 'fail', message: 'Password incorrect' });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updatedAccount = await prisma.user.update({
      where: { Id: accountId },
      data: {
        Username: newUsername,
        Email: newEmail,
        Phone: newPhone,
        Password: hashedPassword,
      },
    });

    res.status(200).json({ status: 'success', account: updatedAccount });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Something went wrong' });
  }
});
function handleData4(name, price, quantity, userId) {
  return (
    !name || !price || !quantity || !userId
  );
}

// Create Product Route
app.post('/src/createProduct', async (req, res) => {
  const { name, price, quantity, description, imgUrl, userId } = req.body;

  if (handleData4(name, price, quantity, userId)) {
    return res.status(400).json({ status: 'fail', message: 'Error in incoming data' });
  }

  try {
    const product = await prisma.product.create({
      data: {
        Name: name,
        Price: price,
        Quantity: quantity,
        Description: description,
        Img_Url: imgUrl,
        UserId: userId,
      },
    });

    res.status(201).json({ status: 'success', product });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Something went wrong' });
  }
});

app.delete('/src/deleteProduct', async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ status: 'fail', message: 'No ID provided' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { Id: id },
    });

    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Product not found' });
    }

    const deletedProduct = await prisma.product.delete({
      where: { Id: id },
    });

    res.status(200).json({ status: 'success', product: deletedProduct });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Something went wrong' });
  }
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'success' });
})
app.get('/src/getAllProducts/', async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ status: 'fail', message: 'No user ID provided' });
  }

  try {
    const products = await prisma.product.findMany({
      where: { UserId: id },
    });

    res.status(200).json({ status: 'success', products });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Something went wrong' });
  }
});

app.get('/src/getProductById', async (req, res) => {
    const id = (req.query.id);

    try {
        const product = await prisma.product.findUnique({
            where: { Id: id }
        });

        if (product) {
            res.json({ status: 'success', product: product });
        } else {
            res.json({ status: 'fail', message: 'Product not found' });
        }
    } catch (error) {
        res.json({ status: 'fail', message: 'Something went wrong' });
    }
});

app.put('/src/updateProduct', async (req, res) => {
    const { id, name, price, quantity, description, imgUrl } = req.body;

    try {
        // Retrieve the existing product details
        const product = await prisma.product.findUnique({
            where: { Id: id },
        });

        if (!product) {
            return res.status(404).json({ status: 'fail', message: 'Product not found' });
        }

        // Use existing product details if new values are not provided
        const updatedName = name || product.Name;
        const updatedPrice = price || product.Price;
        const updatedQuantity = quantity || product.Quantity;

        // Check if a different product with the same name exists
        const alreadyProduct = await prisma.product.findMany({
            where: {
                Name: updatedName,
                Id: { not: (id) },
            },
        });

        if (alreadyProduct.length > 0) {
            return res.status(400).json({ status: 'fail', message: 'Product already exists' });
        }

        // Update the product details
        const updatedProduct = await prisma.product.update({
            where: { Id: (id) },
            data: {
                Name: updatedName,
                Price: (updatedPrice),
                Quantity: (updatedQuantity),
                Description: description || product.description,
                Img_Url: imgUrl || product.imgUrl,
            },
        });

        res.json({ status: 'success', product: updatedProduct });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'fail', message: 'Something went wrong' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});