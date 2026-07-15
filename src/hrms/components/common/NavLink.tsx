import React from "react";
import { Link, LinkProps } from "react-router-dom";

export const NavLink: React.FC<LinkProps> = (props) => {
  return <Link {...props} />;
};
