import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHETetris = await deploy("FHETetris", {
    from: deployer,
    log: true,
  });

  console.log(`FHETetris contract: `, deployedFHETetris.address);
};
export default func;
func.id = "deploy_fheTetris"; // id required to prevent reexecution
func.tags = ["FHETetris"];

