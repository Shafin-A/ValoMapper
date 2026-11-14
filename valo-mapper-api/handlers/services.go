package handlers

import "valo-mapper-api/services"

var (
	strategyService = services.NewStrategyService(services.StrategyServiceDependencies{})
	folderService   = services.NewFolderService(services.FolderServiceDependencies{})
	userService     = services.NewUserService(services.UserServiceDependencies{})
	stackService    = services.NewStackService(services.StackServiceDependencies{})
)
