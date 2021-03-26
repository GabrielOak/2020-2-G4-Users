const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');
const User = require('../Models/UserSchema');
const validation = require('../Utils/validate');
const hash = require('../Utils/hashPass');

const signUpGet = async (req, res) => {
  const users = await User.find();

  return res.status(200).json(users);
};

const signUpPost = async (req, res) => {
  const {
    name, email, role, sector, pass,
  } = req.body;

  const errorMessage = validation.validate(name, email, role, sector, pass);

  if (errorMessage.length) {
    return res.json({ message: errorMessage });
  }

  try {
    const user = await User.create({
      name,
      email,
      role,
      sector,
      pass: await hash.hashPass(pass),
      createdAt: moment.utc(moment.tz('America/Sao_Paulo').format('YYYY-MM-DDTHH:mm:ss')).toDate(),
      updatedAt: moment.utc(moment.tz('America/Sao_Paulo').format('YYYY-MM-DDTHH:mm:ss')).toDate(),
    });
    return res.json(user);
  } catch (error) {
    return res.json({ duplicated: error.keyValue });
  }
};

const signUpPut = async (req, res) => {
  const { id } = req.params;
  const {
    name, email, role, sector, pass,
  } = req.body;
  let newPass;

  const errorMessage = validation.validate(name, email, role, sector, pass);

  if (errorMessage.length) {
    return res.json({ message: errorMessage });
  }

  const usuarioEncontrado = await User.findOne({ _id: id });

  if (await bcrypt.compare(req.body.pass, usuarioEncontrado.pass)) {
    newPass = usuarioEncontrado.pass;
  } else {
    newPass = await hash.hashPass(pass);
  }

  try {
    const updateReturn = await User.findOneAndUpdate({ _id: id }, {
      name,
      email,
      role,
      sector,
      pass: newPass,
      updatedAt: moment.utc(moment.tz('America/Sao_Paulo').format('YYYY-MM-DDTHH:mm:ss')).toDate(),
    },
    { new: true });
    return res.json(updateReturn);
  } catch (error) {
    return res.json({ duplicated: error.keyValue });
  }
};

const signUpDelete = async (req, res) => {
  const { id } = req.params;

  const userReturn = await User.deleteOne({ _id: id });

  if (userReturn.deletedCount === 1) {
    return res.json({ message: 'success' });
  }
  return res.json({ message: 'failure' });
};

const login = async (req, res) => {
  const usuario = await User.findOne({ email: req.body.email });

  if (usuario == null) {
    return res.json({ message: 'user not found' });
  }

  if (await bcrypt.compare(req.body.pass, usuario.pass)) {
    const { id } = usuario;
    const token = jwt.sign({ id }, process.env.SECRET, {
      expiresIn: 240,
    });
    return res.json({ auth: true, token });
  }

  return res.json({ message: 'wrong pass' });
};

module.exports = {
  signUpGet, signUpPost, signUpPut, signUpDelete, login,
};
