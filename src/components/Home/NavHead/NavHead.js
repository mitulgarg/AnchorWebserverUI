import React from 'react';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';

const NavHead = () => {

    return (
        <div>
            <div className="header">
                <Navbar expand="lg" bg="black" data-bs-theme="dark">
                    <Container fluid>                 
                        <Link 
                        className=" text-white text-decoration-none" 
                        to={`/home`}>
                            <h3 className="nav-links" style={{ marginTop: "0.5rem",marginLeft:"2rem"}}>
                                <img src="TransparentWhiteLogo1.png" alt="icon" style={{ width: '40px', height: '40px', marginRight: "1rem" ,marginBottom: "0.2rem"}}>
                                    </img>Auto Anchor
                                    </h3>       
                        </Link>     
                    </Container>
                </Navbar>
            </div>
        </div>
    );
};

export default NavHead;